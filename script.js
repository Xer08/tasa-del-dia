// Variables globales para las tasas
let usdRate = 0;
let eurRate = 0;

// Función para formatear números
function formatNumber(num) {
    return new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

// Función para formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-VE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para obtener tasas del BCV
async function fetchRates() {
    try {
        // Obtener tasa del dólar
        const usdResponse = await fetch('https://dolarflow.com/api/oficial/');
        const usdData = await usdResponse.json();
        
        if (usdData.exito) {
            usdRate = usdData.precio;
            
            // Actualizar UI del dólar
            document.getElementById('usdRate').textContent = formatNumber(usdRate);
            document.getElementById('usdRateText').textContent = formatNumber(usdRate);
            document.getElementById('usdDate').textContent = formatDate(usdData.fechaActualizacion);
            
            // Indicador de cambio
            const usdIndicator = document.getElementById('usdIndicator');
            usdIndicator.textContent = 'BCV Oficial';
            usdIndicator.className = 'px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700';
        }

        // Obtener tasa del euro
        const eurResponse = await fetch('https://dolarflow.com/api/euro/');
        const eurData = await eurResponse.json();
        
        if (eurData.exito) {
            eurRate = eurData.precio;
            
            // Actualizar UI del euro
            document.getElementById('eurRate').textContent = formatNumber(eurRate);
            document.getElementById('eurRateText').textContent = formatNumber(eurRate);
            document.getElementById('eurDate').textContent = formatDate(eurData.fechaActualizacion);
            
            // Indicador de cambio
            const eurIndicator = document.getElementById('eurIndicator');
            eurIndicator.textContent = 'BCV Oficial';
            eurIndicator.className = 'px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700';
        }

        // Actualizar fecha de última actualización
        const now = new Date();
        document.getElementById('lastUpdate').textContent = now.toLocaleString('es-VE');

    } catch (error) {
        console.error('Error al obtener las tasas:', error);
        document.getElementById('usdRate').textContent = 'Error';
        document.getElementById('eurRate').textContent = 'Error';
    }
}

// Función para convertir monedas
function convertCurrency() {
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (isNaN(amount) || amount <= 0) {
        alert('Por favor, ingrese un monto válido');
        return;
    }

    let result = 0;
    let rateText = '';

    // Conversiones
    if (fromCurrency === 'USD' && toCurrency === 'VES') {
        result = amount * usdRate;
        rateText = `Tasa: 1 USD = ${formatNumber(usdRate)} VES`;
    } else if (fromCurrency === 'EUR' && toCurrency === 'VES') {
        result = amount * eurRate;
        rateText = `Tasa: 1 EUR = ${formatNumber(eurRate)} VES`;
    } else if (fromCurrency === 'VES' && toCurrency === 'USD') {
        result = amount / usdRate;
        rateText = `Tasa: 1 USD = ${formatNumber(usdRate)} VES`;
    } else if (fromCurrency === 'VES' && toCurrency === 'EUR') {
        result = amount / eurRate;
        rateText = `Tasa: 1 EUR = ${formatNumber(eurRate)} VES`;
    } else if (fromCurrency === 'USD' && toCurrency === 'EUR') {
        // USD a EUR usando las tasas en VES
        const usdInVes = amount * usdRate;
        result = usdInVes / eurRate;
        rateText = `Conversión vía VES: 1 USD = ${formatNumber(usdRate)} VES, 1 EUR = ${formatNumber(eurRate)} VES`;
    } else if (fromCurrency === 'EUR' && toCurrency === 'USD') {
        // EUR a USD usando las tasas en VES
        const eurInVes = amount * eurRate;
        result = eurInVes / usdRate;
        rateText = `Conversión vía VES: 1 EUR = ${formatNumber(eurRate)} VES, 1 USD = ${formatNumber(usdRate)} VES`;
    }

    // Mostrar resultado
    const resultContainer = document.getElementById('resultContainer');
    const resultElement = document.getElementById('result');
    const conversionRateElement = document.getElementById('conversionRate');

    resultElement.textContent = `${formatNumber(result)} ${toCurrency}`;
    conversionRateElement.textContent = rateText;
    resultContainer.classList.remove('hidden');
}

// Event listeners
document.getElementById('convertBtn').addEventListener('click', convertCurrency);

// También permitir conversión al presionar Enter
document.getElementById('amount').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        convertCurrency();
    }
});

// Cargar tasas al iniciar la página
fetchRates();

// Actualizar tasas cada 5 minutos (300000 ms)
setInterval(fetchRates, 300000);
