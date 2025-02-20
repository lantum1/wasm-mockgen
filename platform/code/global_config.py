from typing import Dict
from dataclasses import dataclass

@dataclass
class BackendAdapterConfig:
    path: str

@dataclass
class AdapterConfig:
    enable_async: bool
    backend: BackendAdapterConfig
    frontend: Dict[str, str]

@dataclass
class GlobalConfig:
    adapters: Dict[str, AdapterConfig]