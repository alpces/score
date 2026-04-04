/**
 * Configuração Firebase
 * Partilhado entre master.html e client.html
 * 
 * @fileoverview Configuração e inicialização do Firebase
 */

const FirebaseConfig = {
    apiKey: "AIzaSyBudmIz5XvRzhlOfj0wHI0W5EIles3wsmY",
    authDomain: "contador-de-pontos-321ee.firebaseapp.com",
    projectId: "contador-de-pontos-321ee",
    storageBucket: "contador-de-pontos-321ee.firebasestorage.app",
    messagingSenderId: "817191889469",
    appId: "1:817191889469:web:cfb88023612f6b37491854",
    databaseURL: "https://contador-de-pontos-321ee-default-rtdb.europe-west1.firebasedatabase.app"
};

// URLs das aplicações
const AppConfig = {
    CLIENT_URL: 'https://alpces.github.io/score/client.html',
    MASTER_URL: 'https://alpces.github.io/score/master.html'
};

// Exportar para uso global
window.FirebaseConfig = FirebaseConfig;
window.AppConfig = AppConfig;
