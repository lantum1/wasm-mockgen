import os
import sys

def modify_js_file(config_name, input_js_path, target_root_path):
    output_path = os.path.join(target_root_path, config_name)
    os.makedirs(output_path, exist_ok=True)
    
    output_file = os.path.join(output_path, f"{config_name}.js")
    
    try:
        with open(input_js_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        lines[0] = f"const wasm = '/{config_name}/server.wasm';\n"
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.writelines(lines)
        
        print(f"Файл успешно сгенерирован: {output_file}")
    except Exception as e:
        print(f"Ошибка при генерации файла: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Использование: python generate_js.py <config_name> <target_root_path>")
        sys.exit(1)
    
    config_name = sys.argv[1]
    target_root_path = os.path.abspath(sys.argv[2])
    
    modify_js_file(config_name, "./skeleton.js", target_root_path)
