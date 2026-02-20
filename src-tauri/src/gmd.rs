use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use std::thread;

/// Structure pour représenter une commande gmdev à exécuter
#[derive(Debug, Clone)]
pub struct GmdCommand {
    pub args: Vec<String>,
    pub cwd: Option<PathBuf>,
    pub project_id: Option<String>,
}

/// Résultat d'une exécution de commande gmdev
#[derive(Debug, Serialize, Deserialize)]
pub struct GmdResult {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

/// Réponse immédiate avec runId pour le streaming
#[derive(Debug, Serialize, Deserialize)]
pub struct GmdRunId {
    pub run_id: String,
}

/// Payload pour l'event gmd:log
#[derive(Debug, Serialize, Deserialize)]
pub struct GmdLogEvent {
    pub run_id: String,
    pub ts: String,
    pub level: String, // "stdout" | "stderr"
    pub line: String,
    pub cmd: String,
    pub cwd: String,
}

/// Payload pour l'event gmd:exit
#[derive(Debug, Serialize, Deserialize)]
pub struct GmdExitEvent {
    pub run_id: String,
    pub exit_code: i32,
}

/// Vérifie si gmdev est disponible dans le PATH
pub fn is_gmd_available() -> bool {
    Command::new("gmdev")
        .arg("--version")
        .output()
        .is_ok()
}

/// Exécute une commande gmdev de manière centralisée (mode non-streaming)
/// 
/// Cette fonction centralise toute la logique d'exécution de gmdev :
/// - Vérifie que gmdev est disponible
/// - Construit la commande avec les arguments fournis
/// - Ajoute le project_id comme dernier argument si fourni
/// - Définit le répertoire de travail si fourni
/// - Retourne un résultat structuré
/// 
/// ⚠️ Pour le streaming live, utilisez `run_gmd_streaming()` à la place
pub fn run_gmd(cmd: GmdCommand) -> Result<GmdResult, String> {
    // Vérifier que gmdev est disponible (une seule fois, centralisée)
    if !is_gmd_available() {
        return Err(
            "gmdev n'est pas disponible. Installez-le et ajoutez-le à votre PATH.".to_string()
        );
    }

    let mut process = Command::new("gmdev");
    
    // Ajouter les arguments de base
    process.args(&cmd.args);

    // Ajouter project_id comme dernier argument si fourni
    // Format: gmdev <command> [args...] [project_id]
    // gmdev accepte project_id comme argument optionnel à la fin
    if let Some(project_id) = &cmd.project_id {
        process.arg(project_id);
    }

    // Définir le cwd si fourni (pour détection auto si project_id non fourni)
    if let Some(cwd) = &cmd.cwd {
        process.current_dir(cwd);
    }

    // Exécuter la commande
    match process.output() {
        Ok(output) => Ok(GmdResult {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            code: output.status.code().unwrap_or(-1),
        }),
        Err(e) => Err(format!(
            "Erreur lors de l'exécution de gmdev: {}. Assurez-vous que gmdev est installé et dans votre PATH.",
            e
        )),
    }
}

/// Exécute une commande gmdev avec streaming live des logs
/// 
/// Cette fonction lance la commande en arrière-plan et émet des events Tauri
/// pour chaque ligne de stdout/stderr et à la fin de l'exécution.
/// 
/// # Arguments
/// - `cmd`: Commande gmdev à exécuter
/// - `app`: Handle de l'application Tauri pour émettre les events
/// - `run_id`: ID unique pour cette exécution
/// 
/// # Events émis
/// - `gmd:log`: Pour chaque ligne de stdout/stderr
/// - `gmd:exit`: Quand la commande se termine
pub fn run_gmd_streaming(
    cmd: GmdCommand,
    app: AppHandle,
    run_id: String,
) -> Result<(), String> {
    // Vérifier que gmdev est disponible
    if !is_gmd_available() {
        return Err(
            "gmdev n'est pas disponible. Installez-le et ajoutez-le à votre PATH.".to_string()
        );
    }

    let mut process = Command::new("gmdev");
    
    // Ajouter les arguments de base
    process.args(&cmd.args);

    // Ajouter project_id comme dernier argument si fourni
    if let Some(project_id) = &cmd.project_id {
        process.arg(project_id);
    }

    // Définir le cwd si fourni
    if let Some(cwd) = &cmd.cwd {
        process.current_dir(cwd);
    }

    // Configurer les pipes pour stdout/stderr
    process.stdout(Stdio::piped());
    process.stderr(Stdio::piped());

    // Construire la commande complète pour les logs
    let cmd_str = format!("gmdev {}", cmd.args.join(" "));
    let cwd_str = cmd.cwd
        .as_ref()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());

    // Spawn le processus
    let mut child = match process.spawn() {
        Ok(c) => c,
        Err(e) => {
            return Err(format!(
                "Erreur lors du lancement de gmdev: {}. Assurez-vous que gmdev est installé et dans votre PATH.",
                e
            ));
        }
    };

    // Récupérer les handles stdout/stderr
    let stdout = match child.stdout.take() {
        Some(s) => s,
        None => return Err("Impossible de capturer stdout".to_string()),
    };
    let stderr = match child.stderr.take() {
        Some(s) => s,
        None => return Err("Impossible de capturer stderr".to_string()),
    };

    // Cloner les données nécessaires pour les threads
    let app_stdout = app.clone();
    let app_stderr = app.clone();
    let app_exit = app.clone();
    let run_id_stdout = run_id.clone();
    let run_id_stderr = run_id.clone();
    let run_id_exit = run_id.clone();
    let cmd_str_stdout = cmd_str.clone();
    let cmd_str_stderr = cmd_str.clone();
    let cwd_str_stdout = cwd_str.clone();
    let cwd_str_stderr = cwd_str.clone();

    // Thread pour lire stdout ligne par ligne
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(line_content) => {
                    let ts = chrono::Utc::now().to_rfc3339();
                    let event = GmdLogEvent {
                        run_id: run_id_stdout.clone(),
                        ts: ts.clone(),
                        level: "stdout".to_string(),
                        line: line_content.clone(),
                        cmd: cmd_str_stdout.clone(),
                        cwd: cwd_str_stdout.clone(),
                    };
                    let _ = app_stdout.emit("gmd:log", &event);
                }
                Err(_) => break, // EOF ou erreur de lecture
            }
        }
    });

    // Thread pour lire stderr ligne par ligne
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            match line {
                Ok(line_content) => {
                    let ts = chrono::Utc::now().to_rfc3339();
                    let event = GmdLogEvent {
                        run_id: run_id_stderr.clone(),
                        ts: ts.clone(),
                        level: "stderr".to_string(),
                        line: line_content.clone(),
                        cmd: cmd_str_stderr.clone(),
                        cwd: cwd_str_stderr.clone(),
                    };
                    let _ = app_stderr.emit("gmd:log", &event);
                }
                Err(_) => break, // EOF ou erreur de lecture
            }
        }
    });

    // Thread pour attendre la fin du processus et émettre l'event exit
    thread::spawn(move || {
        let exit_code = match child.wait() {
            Ok(status) => status.code().unwrap_or(-1),
            Err(_) => -1,
        };
        
        let event = GmdExitEvent {
            run_id: run_id_exit.clone(),
            exit_code,
        };
        let _ = app_exit.emit("gmd:exit", &event);
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_gmd_available() {
        // Ce test vérifie simplement que la fonction ne panique pas
        let _ = is_gmd_available();
    }

    #[test]
    fn test_run_gmd_with_version() {
        // Test avec --version pour vérifier que la commande fonctionne
        let cmd = GmdCommand {
            args: vec!["--version".to_string()],
            cwd: None,
            project_id: None,
        };
        let result = run_gmd(cmd);
        // Si gmdev est disponible, le résultat devrait être Ok
        // Sinon, ce sera une erreur, ce qui est attendu
        match result {
            Ok(r) => {
                assert!(r.code == 0 || r.code == -1); // Code de retour valide
            }
            Err(_) => {
                // Si gmdev n'est pas disponible, c'est normal dans un environnement de test
            }
        }
    }
}
