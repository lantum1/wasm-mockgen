import "./pyodide.asm.js";
import { loadPyodide } from "./pyodide.mjs";

let flaskAppHandler;
let pyodide;

export function run() {
  loadPyodide({}).then(async (_pyodide) => {
    pyodide = _pyodide;
    await pyodide.loadPackage(['micropip']);
  
    await pyodide.runPythonAsync(`
      import micropip
      await micropip.install('Flask')
  
      from flask import Flask, request, jsonify
  
      app = Flask(__name__)
  
      @app.route('/api-python/greet', methods=['GET'])
      def greet():
          name = request.args.get('name', 'World')
          return jsonify({"message": f"Hello, {name}!"})
  
      @app.route('/api-python/echo', methods=['POST'])
      def echo():
          data = request.json
          return jsonify({"you_sent": data})
  
      def handle_request(method, path, query_string, headers, body):
          headers = headers.to_py()
          with app.test_request_context(
              path=path,
              method=method,
              query_string=query_string,
              headers=headers,
              data=body
          ):
              response = app.full_dispatch_request()
              return {
                  "status": response.status_code,
                  "headers": dict(response.headers),
                  "body": response.get_data(as_text=True),
              }
    `);
  
    flaskAppHandler = pyodide.globals.get('handle_request').toJs();
    console.log('Python Flask server initialized!');
  });
  
  return function handleRequest(request) {
    const method = request.method;
    const url = new URL(request.url);
    const headers = Object.fromEntries(request.headers.entries());
    const body = method === 'POST' ? request.text() : '';

    const flaskResponse = flaskAppHandler(
      method,
      url.pathname,
      url.searchParams.toString(),
      headers,
      body
    ).toJs();

    return new Response(flaskResponse.body, {
      status: flaskResponse.status,
      headers: flaskResponse.headers,
    });
  };
}