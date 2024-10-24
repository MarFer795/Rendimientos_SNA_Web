
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly'; 
const range = 'BD!A:AX';

// Definición de url
const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${range}?key=${API_KEY}`;

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    console.log('Iniciando aplicación');
    gapiLoaded();
    gisLoaded();
    document.getElementById('authorize_button').addEventListener('click', handleAuthClick);
    document.getElementById('signout_button').addEventListener('click', handleSignoutClick);
}

function gapiLoaded() {
    console.log('GAPI cargado');
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        maybeEnableButtons();
    } catch (error) {
        console.error('Error al inicializar GAPI client:', error);
        document.getElementById('error-message').textContent = 'Error al inicializar la aplicación. Por favor, inténtalo de nuevo más tarde.';
    }
}

function gisLoaded() {
    console.log('GIS cargado');
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Definido en handleAuthClick
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.display = 'inline-block';
    }
}

function handleAuthClick() {
    console.log('Clic en botón de autorización');
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            console.error('Error de autorización:', resp);
            document.getElementById('error-message').textContent = `Error de autorización: ${resp.error}`;
            return;
        }
        console.log('Autorización exitosa');
        document.getElementById('signout_button').style.display = 'inline-block';
        document.getElementById('authorize_button').innerText = 'Actualizar';
        await cargarDatos();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('content').innerText = '';
        document.getElementById('authorize_button').innerText = 'Autorizar';
        document.getElementById('signout_button').style.display = 'none';
    }
}

function cargarDatos() {
    fetch(url)
        .then(response => {
            if (response.status === 401) {
                throw new Error('No autorizado. Por favor, inicia sesión nuevamente.');
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.values) {
                throw new Error('No se encontraron datos en la respuesta');
            }
            const rows = data.values;
            const tableBody = document.querySelector("#operarioTable tbody");

            tableBody.innerHTML = '';

            // Procesar las filas, ignorando la primera (cabeceras)
            rows.slice(1).forEach(row => {
                const [Mes,nombre,proceso,cantidadProducida,produccionEsperada,rendimiento,ausentismo] = row;

                const rowElement = document.createElement("tr");
                rowElement.innerHTML = `
                    <td>${Mes}</td>
                    <td>${nombre}</td>
                    <td>${proceso}</td>
                    <td>${cantidadProducida}</td>
                    <td>${produccionEsperada}</td>
                    <td>${rendimiento}</td>
                    <td>${ausentismo}</td>

                   `;

                tableBody.appendChild(rowElement);
            });

            mostrarGrafico(rows);
        })
        .catch(error => {
            console.error("Error al cargar los datos de Google Sheets:", error);
            // Muestra el error en la interfaz de usuario
            document.querySelector("#operarioTable tbody").innerHTML = `<tr><td colspan="9">Error: ${error.message}</td></tr>`;
        });
}

function mostrarGrafico(rows) {
    if (rows.length < 2) {
        console.error('No hay suficientes datos para mostrar el gráfico');
        return;
    }

    const ctx = document.getElementById('productividadChart').getContext('2d');

    const nombres = rows.slice(1).map(row => row[1]); // Índice 18 para el nombre
    const cantidadProducida = rows.slice(1).map(row => parseFloat(row[3])); // Índice 15 para cantidad producida
    const rendimiento = rows.slice(1).map(row => parseFloat(row[5])); // Índice 49 para rendimiento

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: nombres,
            datasets: [
                {
                    label: 'Cantidad Producida',
                    data: cantidadProducida,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Rendimiento',
                    data: rendimiento,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
