import os
import sys
import subprocess

def compile_go_to_wasm(config_name, backend_source_path, target_root_path):
    output_dir = os.path.join(target_root_path, config_name)
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = os.path.join(output_dir, "server.wasm")
    
    env = os.environ.copy()
    env["GOOS"] = "js"
    env["GOARCH"] = "wasm"
    
    command = ["go", "build", "-o", output_file, backend_source_path]
    
    try:
        subprocess.run(command, check=True, env=env, cwd=backend_source_path)
        print(f"WASM файл успешно скомпилирован: {output_file}")
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при генерации WASM файла: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Использование: python go.py <config_name> <backend_source_path> <target_root_path>")
        sys.exit(1)
    
    config_name = sys.argv[1]
    backend_source_path = os.path.abspath(sys.argv[2])
    target_root_path = os.path.abspath(sys.argv[3])
    
    compile_go_to_wasm(config_name, backend_source_path, target_root_path)
