/**
 * Configuração Firebase — partilhada por todas as aplicações do projeto.
 *
 * Como usar: carregar como <script> ANTES do script type="module" do Firebase.
 *   <script src="shared/firebase-config.js"></script>
 *   <script type="module">
 *       const firebaseConfig = window.FirebaseConfig;
 *       ...
 *   </script>
 *
 * Os objetos ficam disponíveis em window.FirebaseConfig e window.AppConfig.
 */

const FirebaseConfig = {
    apiKey:            "AIzaSyBudmIz5XvRzhlOfj0wHI0W5EIles3wsmY",
    authDomain:        "contador-de-pontos-321ee.firebaseapp.com",
    projectId:         "contador-de-pontos-321ee",
    storageBucket:     "contador-de-pontos-321ee.firebasestorage.app",
    messagingSenderId: "817191889469",
    appId:             "1:817191889469:web:cfb88023612f6b37491854",
    databaseURL:       "https://contador-de-pontos-321ee-default-rtdb.europe-west1.firebasedatabase.app"
};

/** URLs públicas das aplicações (GitHub Pages). */
const AppConfig = {
    CLIENT_URL:         'https://alpces.github.io/score/client.html',
    MASTER_URL:         'https://alpces.github.io/score/master.html',
    CLIENT_HITSTER_URL: 'https://alpces.github.io/score/client-hitster.html',
    MASTER_HITSTER_URL: 'https://alpces.github.io/score/master-hitster.html',
    CLIENT_JUSTONE_URL: 'https://alpces.github.io/score/client-justone.html',
    MASTER_JUSTONE_URL: 'https://alpces.github.io/score/master-justone.html',
};

window.FirebaseConfig = FirebaseConfig;
window.AppConfig      = AppConfig;
