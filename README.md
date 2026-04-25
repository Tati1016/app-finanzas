# Aplicación de Finanzas v3.0

Plataforma de gestión financiera personal diseñada para empoderar a los usuarios a través del control de su dinero, análisis avanzado, categorización inteligente e insights automatizados.

## 🚀 Demo en Vivo
**[👉 Probar la Aplicación en Vivo](https://personal-finance-analyti-4cf20.web.app)**

---

## 💻 Ingeniería y Arquitectura
Este proyecto fue diseñado con un enfoque estricto en el rendimiento, la escalabilidad y las mejores prácticas de ingeniería de software. Se implementó una arquitectura hiperdesacoplada que demuestra un dominio avanzado de tecnologías fundamentales y servicios Cloud (BaaS):

* **Frontend Architecture (Vanilla JS)**: Desarrollada enteramente en **JavaScript (ES6+)** sin depender de frameworks externos. Implementa un patrón arquitectónico propio que emula la reactividad y el *State Management* centralizado, garantizando un control granular sobre el ciclo de vida de la aplicación y un rendimiento óptimo en la manipulación del DOM.
* **Backend y Autenticación (Firebase)**:
  * **Firebase Auth**: Integración completa para un inicio de sesión seguro (Google Provider y Email/Password).
  * **Firestore Database (NoSQL)**: Modelo de datos estructurado por usuario, protegido mediante estrictas *Security Rules* en la nube para asegurar el aislamiento total y la privacidad de los datos financieros.
* **Sincronización y Caché (Offline-First)**: Implementación del patrón *Singleton* (`DataService`) para sincronizar datos bidireccionalmente entre *Firestore* y el almacenamiento local. Permite el funcionamiento de la aplicación en entornos de baja o nula conectividad.
* **UI/UX y Sistema de Diseño**: Construido con **CSS3 Puro** utilizando un sistema robusto de *Design Tokens* (CSS Custom Properties). Esto permite un *Dark Mode* dinámico de aspecto premium y una experiencia de usuario fluida y completamente responsiva. Gráficos interactivos potenciados por **Chart.js**.
* **Progressive Web App (PWA)**: Implementación de *Service Workers* y manifiesto web, permitiendo la instalación nativa en dispositivos móviles (iOS y Android) y ofreciendo una experiencia *App-like*.

---

## 📊 Características Principales
* **Panel de Análisis Avanzado**: Resumen neto, promedios de gasto y distribución mediante gráficos (Tendencias, Flujo de Caja y Ranking).
* **🧠 Insights Automatizados**: Motor de análisis que detecta patrones y recomienda optimizaciones financieras, clasificadas semánticamente por nivel de severidad.
* **🎯 Presupuestos y Metas**: Configuración de topes mensuales con seguimiento iterativo de metas de ahorro.
* **💾 Automatización de Recurrentes**: Sincronización en segundo plano de ingresos y gastos fijos mensuales.
* **🤖 Categorización Inteligente**: Autoasignación en tiempo real de iconos temáticos mediante análisis de texto (aproximación semántica).

## 🏗️ Estructura de Módulos (Separation of Concerns)
1. **`DataService` (State Manager & Database)**: Controlador exclusivo de los datos, reglas de persistencia y sincronización con Firebase.
2. **`FinanceEngine` (Lógica de Negocio)**: Motor transaccional para cálculos complejos y agrupaciones basadas en filtros cronológicos.
3. **`Analytics` (Motor Semántico)**: Procesador estadístico para extraer métricas clave y generar los *insights*.
4. **`UIController` (Render & DOM)**: Única capa con responsabilidad sobre la mutación de la interfaz gráfica y eventos del usuario.
5. **`App` (Bootstrap)**: Orquestador general del ciclo de vida de la aplicación.

## 📈 KPIs Implementados
* **Tasa de Ahorro Crítica**: `(Balance / IngresoTotal) * 100`. Define el índice de salud financiera.
* **Liquidez Disponible**: `Balance Histórico - Metas De Ahorro Acumuladas`.
* **Métricas Comparativas**: Delta relativo (%) y absoluto frente a periodos anteriores.

## 🚀 Despliegue Local
1. Clona el repositorio.
2. Inicia un servidor estático (ej. `npx serve .`).
3. La aplicación se inicializará al acceder al `index.html`.

---
**Licencia:** Aplicación de Finanzas v3.0 - 2026 © Equipo de Desarrollo Principal.
