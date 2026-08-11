// Variables globales para las tasas
let usdRate = 0;
let eurRate = 0;
let previousUsdRate = 0;
let previousEurRate = 0;

// Función para alternar modo oscuro
function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    
    // Actualizar iconos
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    
    if (isDark) {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
    
    // Guardar preferencia
    localStorage.setItem('darkMode', isDark);
}

// Función para cargar preferencia de modo oscuro
function loadDarkModePreference() {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedMode === 'true' || (savedMode === null && prefersDark)) {
        document.documentElement.classList.add('dark');
        document.getElementById('sunIcon').classList.remove('hidden');
        document.getElementById('moonIcon').classList.add('hidden');
    }
}

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

// Función para solicitar permiso de notificaciones
async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
}

// Función para enviar notificación
function sendNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'android-chrome-192x192.png'
        });
    }
}

// Función para actualizar el cambio de precio en la UI
function updatePriceChange(currency, newRate, oldRate) {
    if (oldRate === 0 || newRate === oldRate) {
        return;
    }

    const change = ((newRate - oldRate) / oldRate * 100).toFixed(2);
    const isIncrease = newRate > oldRate;
    
    const changeElement = document.getElementById(`${currency.toLowerCase()}Change`);
    const changeIcon = document.getElementById(`${currency.toLowerCase()}ChangeIcon`);
    const changeText = document.getElementById(`${currency.toLowerCase()}ChangeText`);
    
    if (isIncrease) {
        changeIcon.innerHTML = '📈';
        changeText.textContent = `+${change}%`;
        changeText.className = 'text-green-600';
    } else {
        changeIcon.innerHTML = '📉';
        changeText.textContent = `${change}%`;
        changeText.className = 'text-red-600';
    }
    
    changeElement.classList.remove('hidden');
}

// Función para obtener historial de precios de los últimos 7 días
async function fetchHistory() {
    try {
        // Generar fechas de los 7 días anteriores (sin incluir hoy)
        const dates = [];
        const today = new Date();
        
        for (let i = 7; i >= 1; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        
        // Obtener datos para cada fecha usando BCV Today
        const tableBody = document.getElementById('historyTableBody');
        tableBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-gray-500 dark:text-gray-400">Cargando historial...</td></tr>';
        
        const historyData = [];
        
        for (const dateStr of dates) {
            try {
                const response = await fetch(`https://bcv.today/api/v1/history/${dateStr}.json`);
                const data = await response.json();
                historyData.push({
                    date: dateStr,
                    USD: data.USD || null,
                    EUR: data.EUR || null
                });
            } catch (error) {
                console.error(`Error al obtener datos para ${dateStr}:`, error);
                historyData.push({
                    date: dateStr,
                    USD: null,
                    EUR: null
                });
            }
        }
        
        // Actualizar la tabla
        tableBody.innerHTML = '';
        
        historyData.forEach(entry => {
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50';
            
            const date = new Date(entry.date);
            const formattedDate = date.toLocaleDateString('es-VE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            
            const usdRate = entry.USD ? formatNumber(entry.USD) : '--';
            const eurRate = entry.EUR ? formatNumber(entry.EUR) : '--';
            
            row.innerHTML = `
                <td class="py-3 text-sm text-gray-700 dark:text-gray-300">${formattedDate}</td>
                <td class="py-3 text-sm font-medium text-gray-800 dark:text-white">${usdRate} VES</td>
                <td class="py-3 text-sm font-medium text-gray-800 dark:text-white">${eurRate} VES</td>
            `;
            
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error al obtener el historial:', error);
        const tableBody = document.getElementById('historyTableBody');
        tableBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-red-500 dark:text-red-400">Error al cargar el historial</td></tr>';
    }
}

// Función para obtener tasas del BCV
async function fetchRates() {
    try {
        // Obtener tasa del dólar
        const usdResponse = await fetch('https://dolarflow.com/api/oficial/');
        const usdData = await usdResponse.json();
        
        if (usdData.exito) {
            // Guardar tasa anterior y actualizar la nueva
            previousUsdRate = usdRate;
            usdRate = usdData.precio;
            
            // Verificar si hubo cambio en la tasa del dólar
            if (previousUsdRate !== 0 && usdRate !== previousUsdRate) {
                const change = ((usdRate - previousUsdRate) / previousUsdRate * 100).toFixed(2);
                const direction = usdRate > previousUsdRate ? 'subió' : 'bajó';
                sendNotification(
                    'Tasa del dólar actualizada',
                    `El dólar ${direction} a ${formatNumber(usdRate)} VES (${change}%)`
                );
                // Actualizar UI con el cambio
                updatePriceChange('USD', usdRate, previousUsdRate);
            }
            
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
            // Guardar tasa anterior y actualizar la nueva
            previousEurRate = eurRate;
            eurRate = eurData.precio;
            
            // Verificar si hubo cambio en la tasa del euro
            if (previousEurRate !== 0 && eurRate !== previousEurRate) {
                const change = ((eurRate - previousEurRate) / previousEurRate * 100).toFixed(2);
                const direction = eurRate > previousEurRate ? 'subió' : 'bajó';
                sendNotification(
                    'Tasa del euro actualizada',
                    `El euro ${direction} a ${formatNumber(eurRate)} VES (${change}%)`
                );
                // Actualizar UI con el cambio
                updatePriceChange('EUR', eurRate, previousEurRate);
            }
            
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

// Función para intercambiar divisas
function swapCurrencies() {
    const fromCurrency = document.getElementById('fromCurrency');
    const toCurrency = document.getElementById('toCurrency');
    
    // Intercambiar valores
    const temp = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;
    
    // Si hay un monto ingresado, convertir automáticamente
    const amount = parseFloat(document.getElementById('amount').value);
    if (!isNaN(amount) && amount > 0) {
        convertCurrency();
    }
}

// Función para convertir monedas
function convertCurrency() {
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (isNaN(amount) || amount <= 0) {
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

// Función para copiar el resultado al portapapeles
function copyResult() {
    const resultElement = document.getElementById('result');
    const conversionRateElement = document.getElementById('conversionRate');
    
    const resultText = resultElement.textContent;
    const rateText = conversionRateElement.textContent;
    
    const textToCopy = `${resultText}\n${rateText}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Cambiar el icono del botón temporalmente para indicar que se copió
        const copyBtn = document.getElementById('copyBtn');
        const originalHTML = copyBtn.innerHTML;
        
        copyBtn.innerHTML = `
            <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
        `;
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar al portapapeles:', err);
    });
}

// Event listeners
document.getElementById('convertBtn').addEventListener('click', convertCurrency);
document.getElementById('swapBtn').addEventListener('click', swapCurrencies);
document.getElementById('copyBtn').addEventListener('click', copyResult);

// También permitir conversión al presionar Enter
document.getElementById('amount').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        convertCurrency();
    }
});

// Conversión automática al cambiar las divisas si hay monto
document.getElementById('fromCurrency').addEventListener('change', function() {
    const amount = parseFloat(document.getElementById('amount').value);
    if (!isNaN(amount) && amount > 0) {
        convertCurrency();
    }
});

document.getElementById('toCurrency').addEventListener('change', function() {
    const amount = parseFloat(document.getElementById('amount').value);
    if (!isNaN(amount) && amount > 0) {
        convertCurrency();
    }
});

// Cargar preferencia de modo oscuro
loadDarkModePreference();

// Event listener para toggle de modo oscuro
document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

// Cargar tasas al iniciar la página
fetchRates();

// Solicitar permiso de notificaciones
requestNotificationPermission();

// Cargar historial de precios
fetchHistory();

// Actualizar tasas cada 5 minutos (300000 ms)
setInterval(fetchRates, 300000);

// Actualizar historial diariamente (86400000 ms = 24 horas)
setInterval(fetchHistory, 86400000);
