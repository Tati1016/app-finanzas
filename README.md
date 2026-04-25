# Dinara - Personal Finance App

Plataforma de gestión financiera personal diseñada para tomar el control de tu dinero a través de análisis avanzado, categorización inteligente e insights automatizados.

## 🚀 Demo en Vivo
Puedes probar la aplicación funcionando en tiempo real aquí:
**[👉 Ver Dinara en Vivo](https://personal-finance-analyti-4cf20.web.app)**

---

## 💻 Acerca de la Tecnología (Para Reclutadores)
Dinara está construida con un enfoque en alto rendimiento y una arquitectura limpia, demostrando un dominio sólido en el desarrollo Frontend y Backend as a Service (BaaS). Aunque no utiliza frameworks reactivos tradicionales (como React o Vue), implementa sus propios patrones de estado, probando un conocimiento profundo de los fundamentos web.

* **Arquitectura Frontend**: Desarrollada enteramente en **Vanilla JavaScript (ES6+)**. Implementa un patrón arquitectónico propio que emula el *State Management* (gestor de estado centralizado) y la reactividad del DOM (similar a React/Redux o Vue/Vuex), demostrando control total sobre el ciclo de vida de la aplicación sin depender de librerías externas.
* **Integración Backend & BaaS**: Integración completa y nativa con el ecosistema de **Firebase**.
  * **Firebase Authentication**: Flujos de autenticación seguros (Google Sign-In y Email/Password) con persistencia de sesión.
  * **Arquitectura de Datos (Firestore)**: Base de datos NoSQL en tiempo real. Utiliza un modelo de datos robusto estructurado por identificador de usuario (`userId`) y asegurado mediante estrictas *Firestore Security Rules* para garantizar el aislamiento y la privacidad de la información.
* **Sincronización y Persistencia**: Implementación del patrón *Singleton* (`DataService`) para la sincronización transparente y bidireccional entre la memoria local, *LocalStorage* y *Firestore*. Manejo avanzado de caché y soporte de ejecución offline.
* **Diseño y UI/UX**: **CSS3 Puro** con un sistema de diseño propio basado en *CSS Custom Properties* (Design Tokens). Interfaz completamente responsiva con un *Dark Mode* dinámico de aspecto premium. Visualización de datos interactiva implementada con **Chart.js**.
* **Progressive Web App (PWA)**: Implementación de *Service Workers* y `manifest.json` que permite la instalación nativa en dispositivos iOS y Android, ofreciendo una experiencia similar a una aplicación móvil con persistencia de datos local.

---

## 📊 Características Principales
* **Panel de Análisis Avanzado**: Resumen neto, promedio de gasto diario y distribución detallada mediante gráficos (Tendencias, Flujo de Caja y Ranking).
* **🧠 Insights Automatizados**: Algoritmo de análisis semántico que detecta patrones de gasto y genera recomendaciones accionables clasificadas por nivel de severidad.
* **🎯 Presupuestos y Metas**: Configuración de límites mensuales por categoría y sistema iterativo para metas de ahorro. El capital reservado se aísla automáticamente de los fondos disponibles.
* **💾 Automatización Financiera**: Sincronización en segundo plano de ingresos y gastos fijos recurrentes.
* **🤖 Categorización Inteligente**: Algoritmo que lee las descripciones y asigna automáticamente iconos temáticos por aproximación semántica en tiempo real.

## 🏗️ Estructura de Módulos (Separation of Concerns)
El proyecto está estructurado bajo principios de código limpio y altamente desacoplado:

1. **`DataService` (State Manager & Database)**: Controlador exclusivo de los datos y su sincronización.
2. **`FinanceEngine` (Core Business Logic)**: Motor transaccional. Realiza cálculos, balances y agrupa la información basándose en filtros cronológicos complejos.
3. **`Analytics` (Semantic Engine)**: Motor encargado de digerir la información para extraer métricas clave y generar los *insights*.
4. **`UIController` (Render & DOM Manipulation)**: Único módulo con responsabilidad sobre la actualización de la interfaz y captura de eventos.
5. **`App` (Bootstrap)**: Orquestador general que inicializa los servicios y suscriptores.

## 📈 KPIs Calculados
* **Tasa de Ahorro Crítica**: `(Balance / IngresoTotal) * 100` (Determina la Puntuación de Salud Financiera).
* **Liquidez Real Disponible**: `Balance Histórico - Metas De Ahorro Acumuladas`.
* **Métricas Comparativas**: Delta relativo y absoluto versus el periodo cronológico anterior.

## 🚀 Instalación y Despliegue Local
1. Clona el repositorio.
2. Inicia un servidor estático local en el directorio raíz (ej. `npx serve .` o Live Server de VSCode).
3. La aplicación se inicializará automáticamente al abrir el archivo `index.html`.

---
**Licencia:** Dinara v3.0 - 2026 © Equipo de Desarrollo Principal.
