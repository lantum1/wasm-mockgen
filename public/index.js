const uniqueId = crypto.randomUUID();

navigator.serviceWorker.register(`/sw.js?module=api-python`, { scope: '/' , type: 'module'});

navigator.serviceWorker.ready.then((registration) => {
  registration.active.postMessage({ type: 'SET_UUID', uuid: uniqueId });
});

navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data?.type === 'SERVICE_WORKER_READY' && event.data?.id === uniqueId) {
      console.log('got SERVICE_WORKER_READY');
  }
});

export async function health() {
  const res = await fetch('api-python/greet', { method: 'GET' });
  const message = await res.json();
  console.log(message);
  alert(JSON.stringify(message));
}

export async function getPeople() {
  const res = await fetch('api-python/greet', { method: 'GET' });
  const message = await res.json();
  console.log(message);
  alert(JSON.stringify(message));
}

export async function postPeople() {
  const name = document.querySelector('#postPersonName').value;
  const age = document.querySelector('#postPersonAge').value;

  const res = await fetch('api/people', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: name, age: Number(age) }),
  });

  const message = await res.json();
  console.log(message);
  alert(JSON.stringify(message));
}
