# Finance App

Plataforma de gestión financiera personal diseñada para tomar el control de tu dinero a través de análisis avanzado, categorización inteligente e insights automatizados.

## Características

- 📊 **Panel de Análisis Avanzado**: Resumen neto, promedio de gasto diario, y distribución mediante gráficos (Tendencias, Flujo de Caja, y Ranking).
- 🧠 **Insights Automatizados**: Algoritmo que detecta patrones y recomienda optimizaciones, clasificado de manera semántica según el nivel de severidad.
- 🎯 **Presupuestos y Metas**: Configuración de topes mensuales para categorías específicas, y seguimiento iterativo para metas de ahorro. El capital reservado se excluye automáticamente de la disponibilidad diaria.
- 💾 **Operaciones Recurrentes**: Sincronización automática de gastos/ingresos fijos todos los meses.
- 📱 **Soporte PWA Mobile**: Instalable nativamente en iOS y Android con acceso offline y persistencia local progresiva.
- 🤖 **Categorización Inteligente**: Auto-asignación de iconos temáticos por aproximación semántica en tiempo real.

## Arquitectura

El proyecto sigue una arquitectura estricta e hiper-desacoplada:

1. **`DataService` (State Manager & BD)**: Sincronización transparente con LocalStorage/Firebase. Se encarga de la manipulación de arreglos.
2. **`FinanceEngine` (Lógica Pura Financiera)**: Realiza cálculos transaccionales (balances, agrupaciones) y maneja los filtros cronológicos modulares (Hoy, Quincena, Mes Específico, etc.).
3. **`Analytics` (Motor Semántico)**: Procesamiento de "micro-summaries" y extracción de métricas para generar "insights".
4. **`UIController` (Render & DOM)**: Único módulo con permiso de mutar la interfaz gráfica y montar los flujos en pantalla.
5. **`App` (Bootstrap)**: Orquestador general y controlador de inicialización en la ventana.

## Stack Tecnológico

- **Core**: Vanilla JavaScript (ES6+), HTML5, y Vanilla CSS con Variables Nativas (Design Tokens).
- **Backend/Auth**: Firebase Auth (Google Sign-In + Email/Pass). Cache local progresivo para PWA.
- **Gráficos**: Chart.js configurado con una paleta Dark Mode dinámica.

## KPIs Calculados

1. **Tasa de Ahorro Crítica**: `(Balance / IngresoTotal) * 100` que determina la Puntuación de Salud.
2. **Dinero Disponible**: `BalanceHistórico - MetasDeAhorroAcumuladas`.
3. **Comparativas**: Incrementos relativos vs periodo anterior expresados en porcentajes e impactos absolutos.

## Instalación & Despliegue

1. Clona el repositorio.
2. Inicia un servidor local estático en la raíz (ej. `npx serve .` o Live Server)
3. La aplicación funcionará out-of-the-box al abrir el `index.html`.

## Licencia

Finance App v3.0 - 2026 © Core Team.
