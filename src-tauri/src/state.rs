use std::collections::HashMap;
use std::sync::Mutex;

/// État global de l'application pour stocker les PIDs des services
pub struct AppState {
    pub pids: Mutex<HashMap<String, u32>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            pids: Mutex::new(HashMap::new()),
        }
    }

    /// Enregistre un PID pour un service
    pub fn register_pid(&self, service: String, pid: u32) {
        if let Ok(mut pids) = self.pids.lock() {
            pids.insert(service, pid);
        }
    }

    /// Récupère le PID d'un service
    pub fn get_pid(&self, service: &str) -> Option<u32> {
        if let Ok(pids) = self.pids.lock() {
            pids.get(service).copied()
        } else {
            None
        }
    }

    /// Supprime le PID d'un service
    pub fn remove_pid(&self, service: &str) -> Option<u32> {
        if let Ok(mut pids) = self.pids.lock() {
            pids.remove(service)
        } else {
            None
        }
    }

    /// Récupère tous les PIDs
    pub fn get_all_pids(&self) -> HashMap<String, u32> {
        if let Ok(pids) = self.pids.lock() {
            pids.clone()
        } else {
            HashMap::new()
        }
    }
}

