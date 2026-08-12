// Variables globales para las tasas
let usdRate = 0;
let eurRate = 0;
let previousUsdRate = 0;
let previousEurRate = 0;
let usdEveningRate = null; // Tasa del ajuste de 7PM
let eurEveningRate = null; // Tasa del ajuste de 7PM
let useCustomRate = false; // Bandera para usar tasa personalizada

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
function updatePriceChange(currency, newRate, oldRate, isSameDayChange = false) {
    if (oldRate === 0 || !oldRate || newRate === oldRate) {
        return;
    }

    const priceChange = newRate - oldRate;
    const percentageChange = ((newRate - oldRate) / oldRate * 100).toFixed(2);
    const isIncrease = newRate > oldRate;
    
    const changeElement = document.getElementById(`${currency.toLowerCase()}Change`);
    const changeIcon = document.getElementById(`${currency.toLowerCase()}ChangeIcon`);
    const changeText = document.getElementById(`${currency.toLowerCase()}ChangeText`);
    
    if (isSameDayChange) {
        // Cambio dentro del mismo día (actualización de 7:20 PM)
        if (isIncrease) {
            changeIcon.innerHTML = '🔄';
            changeText.textContent = `${formatNumber(oldRate)} → ${formatNumber(newRate)} VES (+${percentageChange}%)`;
            changeText.className = 'text-blue-600 dark:text-blue-400';
        } else {
            changeIcon.innerHTML = '🔄';
            changeText.textContent = `${formatNumber(oldRate)} → ${formatNumber(newRate)} VES (${percentageChange}%)`;
            changeText.className = 'text-blue-600 dark:text-blue-400';
        }
    } else {
        // Cambio respecto al día anterior
        if (isIncrease) {
            changeIcon.innerHTML = '📈';
            changeText.textContent = `+${formatNumber(priceChange)} VES (+${percentageChange}%)`;
            changeText.className = 'text-green-600 dark:text-green-400';
        } else {
            changeIcon.innerHTML = '📉';
            changeText.textContent = `${formatNumber(priceChange)} VES (${percentageChange}%)`;
            changeText.className = 'text-red-600 dark:text-red-400';
        }
    }
    
    changeElement.classList.remove('hidden');
}

// Función para obtener historial de precios de los últimos 7 días
async function fetchHistory() {
    try {
        // Generar fechas de los 7 días anteriores (sin incluir hoy)
        const dates = [];
        const today = new Date();
        
        // Asegurar que trabajamos con la fecha local y no UTC
        const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        for (let i = 7; i >= 1; i--) {
            const date = new Date(localToday);
            date.setDate(date.getDate() - i);
            // Formatear como YYYY-MM-DD en zona horaria local
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dates.push(`${year}-${month}-${day}`);
        }
        
        console.log('Fechas del historial a consultar:', dates);
        
        // Obtener datos para cada fecha usando BCV Today
        const tableBody = document.getElementById('historyTableBody');
        tableBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-gray-500 dark:text-gray-400">Cargando historial...</td></tr>';
        
        const historyData = [];
        
        for (const dateStr of dates) {
            try {
                console.log(`Obteniendo datos para fecha: ${dateStr}`);
                const response = await fetch(`https://bcv.today/api/v1/history/${dateStr}.json`);
                
                if (!response.ok) {
                    console.error(`Error HTTP al obtener datos para ${dateStr}:`, response.status);
                    historyData.push({
                        date: dateStr,
                        USD: null,
                        EUR: null
                    });
                    continue;
                }
                
                const data = await response.json();
                console.log(`Datos recibidos para ${dateStr}:`, data);
                
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
            
            const date = new Date(entry.date + 'T00:00:00'); // Forzar hora local
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
        
        console.log('Historial actualizado correctamente con', historyData.length, 'registros');
        
    } catch (error) {
        console.error('Error al obtener el historial:', error);
        const tableBody = document.getElementById('historyTableBody');
        tableBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-red-500 dark:text-red-400">Error al cargar el historial</td></tr>';
    }
}

// Función para obtener tasas del BCV
async function fetchRates() {
    try {
        // Obtener la fecha de ayer para comparar con el día anterior
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        
        // Obtener tasas del día anterior desde BCV Today
        let yesterdayUsdRate = null;
        let yesterdayEurRate = null;
        
        try {
            const yesterdayResponse = await fetch(`https://bcv.today/api/v1/history/${yesterdayStr}.json`);
            const yesterdayData = await yesterdayResponse.json();
            yesterdayUsdRate = yesterdayData.USD || null;
            yesterdayEurRate = yesterdayData.EUR || null;
            console.log('Tasas de ayer:', { USD: yesterdayUsdRate, EUR: yesterdayEurRate });
        } catch (error) {
            console.error('Error al obtener tasas de ayer:', error);
        }
        
        // Obtener hora actual para determinar si estamos después de las 7PM
        const today = new Date();
        const currentHour = today.getHours();
        const isAfter7PM = currentHour >= 19;
        
        // Obtener tasa del dólar
        const usdResponse = await fetch('https://dolarflow.com/api/oficial/');
        const usdData = await usdResponse.json();
        
        if (usdData.exito) {
            // Guardar tasa anterior y actualizar la nueva
            previousUsdRate = usdRate;
            const newUsdRate = usdData.precio;
            
            // Si es después de las 7PM y la tasa es diferente, guardar como tasa de evening
            if (isAfter7PM && usdRate !== 0 && newUsdRate !== usdRate) {
                usdEveningRate = newUsdRate;
                
                // Mostrar la tasa de evening
                const eveningRateElement = document.getElementById('usdEveningRate');
                const eveningRateText = document.getElementById('usdEveningRateText');
                eveningRateText.textContent = formatNumber(usdEveningRate) + ' VES';
                eveningRateElement.classList.remove('hidden');
                
                console.log('Tasa evening USD:', usdEveningRate);
            } else if (!isAfter7PM || usdRate === 0) {
                // Antes de las 7PM o primera carga, actualizar la tasa principal
                usdRate = newUsdRate;
            }
            
            // Mostrar cambio respecto al día anterior
            if (yesterdayUsdRate) {
                updatePriceChange('USD', usdRate, yesterdayUsdRate, false);
            }
            
            // Actualizar UI del dólar (mantener la tasa principal)
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
            const newEurRate = eurData.precio;
            
            // Si es después de las 7PM y la tasa es diferente, guardar como tasa de evening
            if (isAfter7PM && eurRate !== 0 && newEurRate !== eurRate) {
                eurEveningRate = newEurRate;
                
                // Mostrar la tasa de evening
                const eveningRateElement = document.getElementById('eurEveningRate');
                const eveningRateText = document.getElementById('eurEveningRateText');
                eveningRateText.textContent = formatNumber(eurEveningRate) + ' VES';
                eveningRateElement.classList.remove('hidden');
                
                console.log('Tasa evening EUR:', eurEveningRate);
            } else if (!isAfter7PM || eurRate === 0) {
                // Antes de las 7PM o primera carga, actualizar la tasa principal
                eurRate = newEurRate;
            }
            
            // Mostrar cambio respecto al día anterior
            if (yesterdayEurRate) {
                updatePriceChange('EUR', eurRate, yesterdayEurRate, false);
            }
            
            // Actualizar UI del euro (mantener la tasa principal)
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

    // Determinar qué tasas usar
    let currentUsdRate, currentEurRate;
    
    if (useCustomRate) {
        const customRate = parseFloat(document.getElementById('customRate').value);
        if (isNaN(customRate) || customRate <= 0) {
            alert('Por favor, ingrese una tasa personalizada válida');
            return;
        }
        // Usar la tasa personalizada para ambas divisas
        currentUsdRate = customRate;
        currentEurRate = customRate;
    } else {
        // Usar la tasa de evening si está disponible, sino la tasa principal
        currentUsdRate = usdEveningRate || usdRate;
        currentEurRate = eurEveningRate || eurRate;
    }

    // Conversiones
    if (fromCurrency === 'USD' && toCurrency === 'VES') {
        result = amount * currentUsdRate;
        rateText = useCustomRate ? `Tasa personalizada: 1 USD = ${formatNumber(currentUsdRate)} VES` : `Tasa: 1 USD = ${formatNumber(currentUsdRate)} VES`;
    } else if (fromCurrency === 'EUR' && toCurrency === 'VES') {
        result = amount * currentEurRate;
        rateText = useCustomRate ? `Tasa personalizada: 1 EUR = ${formatNumber(currentEurRate)} VES` : `Tasa: 1 EUR = ${formatNumber(currentEurRate)} VES`;
    } else if (fromCurrency === 'VES' && toCurrency === 'USD') {
        result = amount / currentUsdRate;
        rateText = useCustomRate ? `Tasa personalizada: 1 USD = ${formatNumber(currentUsdRate)} VES` : `Tasa: 1 USD = ${formatNumber(currentUsdRate)} VES`;
    } else if (fromCurrency === 'VES' && toCurrency === 'EUR') {
        result = amount / currentEurRate;
        rateText = useCustomRate ? `Tasa personalizada: 1 EUR = ${formatNumber(currentEurRate)} VES` : `Tasa: 1 EUR = ${formatNumber(currentEurRate)} VES`;
    } else if (fromCurrency === 'USD' && toCurrency === 'EUR') {
        // USD a EUR usando las tasas en VES
        const usdInVes = amount * currentUsdRate;
        result = usdInVes / currentEurRate;
        rateText = useCustomRate ? `Tasa personalizada: 1 USD = ${formatNumber(currentUsdRate)} VES, 1 EUR = ${formatNumber(currentEurRate)} VES` : `Conversión vía VES: 1 USD = ${formatNumber(currentUsdRate)} VES, 1 EUR = ${formatNumber(currentEurRate)} VES`;
    } else if (fromCurrency === 'EUR' && toCurrency === 'USD') {
        // EUR a USD usando las tasas en VES
        const eurInVes = amount * currentEurRate;
        result = eurInVes / currentUsdRate;
        rateText = useCustomRate ? `Tasa personalizada: 1 EUR = ${formatNumber(currentEurRate)} VES, 1 USD = ${formatNumber(currentUsdRate)} VES` : `Conversión vía VES: 1 EUR = ${formatNumber(currentEurRate)} VES, 1 USD = ${formatNumber(currentUsdRate)} VES`;
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
    
    const resultText = resultElement.textContent;
    
    // Extraer solo el número (antes del espacio y la moneda)
    const numberOnly = resultText.split(' ')[0];
    
    navigator.clipboard.writeText(numberOnly).then(() => {
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

// Función para actualizar tasas manualmente usando BCV Today
async function manualRefresh() {
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshIcon = document.getElementById('refreshIcon');
    
    // Mostrar animación de carga
    refreshIcon.classList.add('animate-spin');
    refreshBtn.disabled = true;
    
    try {
        // Obtener la fecha de hoy en formato YYYY-MM-DD
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        console.log('Actualización manual para fecha:', todayStr);
        
        // Obtener tasas de hoy desde BCV Today
        const response = await fetch(`https://bcv.today/api/v1/history/${todayStr}.json`);
        
        if (!response.ok) {
            throw new Error('Error al obtener datos de BCV Today');
        }
        
        const data = await response.json();
        console.log('Datos de BCV Today:', data);
        
        // Obtener hora actual para determinar si estamos después de las 7PM
        const currentHour = today.getHours();
        const isAfter7PM = currentHour >= 19;
        
        if (data.USD) {
            // Si es después de las 7PM y la tasa es diferente, guardar como tasa de evening
            if (isAfter7PM && usdRate !== 0 && data.USD !== usdRate) {
                usdEveningRate = data.USD;
                
                // Mostrar la tasa de evening
                const eveningRateElement = document.getElementById('usdEveningRate');
                const eveningRateText = document.getElementById('usdEveningRateText');
                eveningRateText.textContent = formatNumber(usdEveningRate) + ' VES';
                eveningRateElement.classList.remove('hidden');
                
                console.log('Tasa evening USD:', usdEveningRate);
            } else if (!isAfter7PM && usdRate === 0) {
                // Primera carga antes de las 7PM
                usdRate = data.USD;
            }
            
            // Si la tasa principal aún no está cargada, cargarla
            if (usdRate === 0) {
                usdRate = data.USD;
            }
            
            // Obtener tasa de ayer para comparar
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
            
            try {
                const yesterdayResponse = await fetch(`https://bcv.today/api/v1/history/${yesterdayStr}.json`);
                const yesterdayData = await yesterdayResponse.json();
                
                if (yesterdayData.USD) {
                    updatePriceChange('USD', usdRate, yesterdayData.USD, false);
                }
            } catch (error) {
                console.error('Error al obtener tasa de ayer:', error);
            }
            
            // Actualizar UI del dólar (mantener la tasa principal)
            document.getElementById('usdRate').textContent = formatNumber(usdRate);
            document.getElementById('usdRateText').textContent = formatNumber(usdRate);
            document.getElementById('usdDate').textContent = formatDate(todayStr);
            
            const usdIndicator = document.getElementById('usdIndicator');
            usdIndicator.textContent = 'BCV Oficial';
            usdIndicator.className = 'px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700';
        }
        
        if (data.EUR) {
            // Si es después de las 7PM y la tasa es diferente, guardar como tasa de evening
            if (isAfter7PM && eurRate !== 0 && data.EUR !== eurRate) {
                eurEveningRate = data.EUR;
                
                // Mostrar la tasa de evening
                const eveningRateElement = document.getElementById('eurEveningRate');
                const eveningRateText = document.getElementById('eurEveningRateText');
                eveningRateText.textContent = formatNumber(eurEveningRate) + ' VES';
                eveningRateElement.classList.remove('hidden');
                
                console.log('Tasa evening EUR:', eurEveningRate);
            } else if (!isAfter7PM && eurRate === 0) {
                // Primera carga antes de las 7PM
                eurRate = data.EUR;
            }
            
            // Si la tasa principal aún no está cargada, cargarla
            if (eurRate === 0) {
                eurRate = data.EUR;
            }
            
            // Obtener tasa de ayer para comparar
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
            
            try {
                const yesterdayResponse = await fetch(`https://bcv.today/api/v1/history/${yesterdayStr}.json`);
                const yesterdayData = await yesterdayResponse.json();
                
                if (yesterdayData.EUR) {
                    updatePriceChange('EUR', eurRate, yesterdayData.EUR, false);
                }
            } catch (error) {
                console.error('Error al obtener tasa de ayer:', error);
            }
            
            // Actualizar UI del euro (mantener la tasa principal)
            document.getElementById('eurRate').textContent = formatNumber(eurRate);
            document.getElementById('eurRateText').textContent = formatNumber(eurRate);
            document.getElementById('eurDate').textContent = formatDate(todayStr);
            
            const eurIndicator = document.getElementById('eurIndicator');
            eurIndicator.textContent = 'BCV Oficial';
            eurIndicator.className = 'px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700';
        }
        
        // Actualizar fecha de última actualización
        const now = new Date();
        document.getElementById('lastUpdate').textContent = now.toLocaleString('es-VE');
        
        // Actualizar el historial automáticamente
        await fetchHistory();
        
        // Mostrar notificación de éxito
        sendNotification('Actualización completada', 'Las tasas han sido actualizadas correctamente');
        
    } catch (error) {
        console.error('Error en actualización manual:', error);
        sendNotification('Error en actualización', 'No se pudieron actualizar las tasas');
        alert('Error al actualizar las tasas. Por favor, intente nuevamente.');
    } finally {
        // Restaurar el botón
        refreshIcon.classList.remove('animate-spin');
        refreshBtn.disabled = false;
    }
}

// Función para alternar el uso de tasa personalizada
function toggleCustomRate() {
    const customRateContainer = document.getElementById('customRateContainer');
    const customRateBtn = document.getElementById('customRateBtn');
    
    useCustomRate = !useCustomRate;
    
    if (useCustomRate) {
        customRateContainer.classList.remove('hidden');
        customRateBtn.textContent = 'Usar tasa oficial';
        customRateBtn.classList.remove('from-orange-500', 'to-red-500', 'hover:from-orange-600', 'hover:to-red-600');
        customRateBtn.classList.add('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
    } else {
        customRateContainer.classList.add('hidden');
        customRateBtn.textContent = 'Monto personalizado';
        customRateBtn.classList.remove('from-green-500', 'to-emerald-500', 'hover:from-green-600', 'hover:to-emerald-600');
        customRateBtn.classList.add('from-orange-500', 'to-red-500', 'hover:from-orange-600', 'hover:to-red-600');
        document.getElementById('customRate').value = '';
    }
}

// Event listeners
document.getElementById('convertBtn').addEventListener('click', convertCurrency);
document.getElementById('swapBtn').addEventListener('click', swapCurrencies);
document.getElementById('copyBtn').addEventListener('click', copyResult);
document.getElementById('refreshBtn').addEventListener('click', manualRefresh);
document.getElementById('customRateBtn').addEventListener('click', toggleCustomRate);

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

// Actualizar historial cada hora (3600000 ms = 1 hora) para asegurar datos actualizados
setInterval(fetchHistory, 3600000);
