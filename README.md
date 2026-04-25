# Aplicación de Finanzas v3.0

Plataforma de gestión financiera personal diseñada para tomar el control de tu dinero a través de análisis avanzado, categorización inteligente e insights automatizados.

## 🚀 Demo en Vivo
Puedes probar la aplicación funcionando en tiempo real aquí:
**[👉 Ver Aplicación en Vivo](https://personal-finance-analyti-4cf20.web.app)**

---

## 📊 Características
* **Panel de Análisis Avanzado**: Resumen neto, promedio de gasto diario, y distribución mediante gráficos (Tendencias, Flujo de Caja, y Ranking).
* **🧠 Insights Automatizados**: Algoritmo que detecta patrones y recomienda optimizaciones, clasificado de manera semántica según el nivel de severidad.
* **🎯 Presupuestos y Metas**: Configuración de topes mensuales para categorías específicas, y seguimiento iterativo para metas de ahorro. El capital reservado se excluye automáticamente de la disponibilidad diaria.
* **💾 Operaciones Recurrentes**: Sincronización automática de gastos/ingresos fijos todos los meses.
* **📱 Soporte PWA Mobile**: Instalable nativamente en iOS y Android con acceso sin conexión y persistencia local progresiva.
* **🤖 Categorización Inteligente**: Autoasignación de iconos temáticos por aproximación semántica en tiempo real.

## 🏗️ Arquitectura
El proyecto sigue una arquitectura estricta e hiperdesacoplada:

1. **`DataService` (State Manager & BD)**: Sincronización transparente con LocalStorage/Firebase. Se encarga de la manipulación de arreglos.
2. **`FinanceEngine` (Lógica Pura Financiera)**: Realiza cálculos transaccionales (saldos, agrupaciones) y maneja los filtros cronológicos modulares (Hoy, Quincena, Mes Específico, etc.).
3. **`Analytics` (Motor Semántico)**: Procesamiento de "micro-resúmenes" y extracción de métricas para generar "insights".
4. **`UIController` (Render & DOM)**: Único módulo con permiso para mutar la interfaz gráfica y montar los flujos en pantalla.
5. **`App` (Bootstrap)**: Orquestador general y controlador de inicialización en la ventana.

## 🛠️ Pila Tecnológica
* **Core**: Vanilla JavaScript (ES6+), HTML5, y Vanilla CSS con Variables Nativas (Design Tokens).
* **Backend/Autenticación**: Autenticación de Firebase (Inicio de sesión con Google + Correo electrónico/Contraseña). Caché local progresiva para PWA.
* **Gráficos**: Chart.js configurado con una paleta Dark Mode dinámica.

## 📈 KPIs Calculados
* **Tasa de Ahorro Crítica**: `(Balance / IngresoTotal) * 100` que determina la Puntuación de Salud.
* **Dinero Disponible**: `Balance Histórico - Metas De Ahorro Acumuladas`.
* **Comparativas**: Incrementos relativos vs periodo anterior expresados en porcentajes e impactos absolutos.

## 💻 Instalación y Despliegue
1. Clona el repositorio.
2. Inicia un servidor local estático en la raíz (ej. `npx serve .` o Live Server).
3. La aplicación funcionará de inmediato al abrir el `index.html`.

---
**Licencia:** Aplicación de finanzas v3.0 - 2026 © Equipo principal.

