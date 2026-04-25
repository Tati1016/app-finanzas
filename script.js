import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    sendPasswordResetEmail,
    sendEmailVerification
} from "firebase/auth";


import { 
    doc, 
    setDoc, 
    getDoc, 
    onSnapshot,
    updateDoc
} from "firebase/firestore";

// Formatador de Moneda
const formatCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Diccionario de Palabras Clave para Auto-Detección de Iconos
const EMOJI_KEYWORDS = {
    // Entretenimiento / Ocio
    '🎥': ['netflix', 'hbo', 'disney', 'cinema', 'cine', 'pelicula', 'teatro', 'movie'],
    '🍿': ['crispetas', 'snack', 'confiteria'],
    '🎵': ['spotify', 'musica', 'deezer', 'itunes', 'concierto', 'festival'],
    '🎮': ['playstation', 'xbox', 'nintendo', 'steam', 'epic', 'juego', 'game'],
    // Transporte / Movilidad
    '🚗': ['uber', 'taxi', 'cabify', 'parqueadero', 'peaje', 'carro', 'automovil'],
    '⛽': ['gasolina', 'combustible', 'estacion de servicio', 'terpel', 'primax'],
    '🚲': ['bicicleta', 'bici', 'scooter', 'rapibici'],
    '✈️': ['avion', 'viaje', 'vuelo', 'aeropuerto', 'turismo', 'hotel', 'airbnb'],
    // Salud / Bienestar
    '💊': ['farmacia', 'medicina', 'pastillas', 'drogueria', 'remedio'],
    '🏥': ['hospital', 'clinica', 'doctor', 'cita medica', 'eps', 'seguro'],
    '💪': ['gym', 'gimnasio', 'entrenamiento', 'deporte', 'crossfit'],
    // Comida / Hogar
    '🍔': ['hamburguesa', 'comida chatarra', 'restaurante', 'mcdonalds', 'burger king'],
    '🍕': ['pizza', 'pizzeria'],
    '☕': ['cafe', 'starbucks', 'juan valdez', 'cafeteria', 'desayuno'],
    '🛒': ['mercado', 'supermercado', 'exito', 'carulla', 'd1', 'ara', 'isimo'],
    '🏠': ['arriendo', 'alquiler', 'servicios', 'luz', 'agua', 'gas', 'internet', 'vivienda'],
    // Estilo / Cuidado Personal
    '👕': ['ropa', 'zara', 'bershka', 'h&m', 'compras', 'mall', 'centro comercial', 'fashion'],
    '👟': ['zapatos', 'tenis', 'nike', 'adidas'],
    '💄': ['mujer', 'maquillaje', 'belleza', 'salon', 'peluqueria', 'uñas', 'skincare', 'estetica', 'spa'],
    '👨': ['hombre', 'barberia', 'barba', 'corte'],
    '📱': ['celular', 'iphone', 'xiaomi', 'telefonia', 'claro', 'movistar', 'tigo'],
    // Otros
    '🐶': ['mascota', 'perro', 'gato', 'veterinaria', 'purina'],
    '🎁': ['regalo', 'detalle', 'sorpresa'],
    '💵': ['efectivo', 'pago', 'nomina', 'transferencia', 'prestamo', 'banco']
};

/* =========================================================
   1. DATA SERVICE (Persistencia y Modelo de Datos - FIREBASE)
   ========================================================= */
const DataService = {
    state: {
        userId: null,
        transactions: [],     // { id, type, category, amount, date }
        budgets: {},          // { category: limit_amount }
        goals: [],            // { id, title, target }
        customIcons: {},      // { category: emoji }
        recurring: [],        // { id, type, category, amount, day, lastRunMonth }
        categories: {
            ingreso: ['Salario', 'Negocio', 'Inversiones', 'Freelance', 'Regalos', 'Reembolsos', 'Otros Ingresos'],
            gasto: ['Alimentación', 'Vivienda', 'Transporte', 'Entretenimiento', 'Salud', 'Educación', 'Compras', 'Servicios', 'Suscripciones', 'Mascotas', 'Regalos', 'Deudas', 'Seguros', 'Otros Gastos']
        },
        categoryColors: {
            'Alimentación': '#f43f5e', 'Vivienda': '#ec4899', 'Transporte': '#d946ef', 'Entretenimiento': '#a855f7',
            'Salud': '#8b5cf6', 'Educación': '#6366f1', 'Compras': '#3b82f6', 'Otros Gastos': '#0ea5e9',
            'Servicios': '#f59e0b', 'Suscripciones': '#f97316', 'Mascotas': '#fb923c', 'Deudas': '#ef4444', 'Seguros': '#64748b',
            'Salario': '#10b981', 'Negocio': '#34d399', 'Inversiones': '#059669', 'Freelance': '#14b8a6', 'Regalos': '#2dd4bf', 'Reembolsos': '#4ade80', 'Otros Ingresos': '#a7f3d0'
        },
        hiddenCategories: []
    },
    
    unsubscribe: null,

    async init(userId) {
        if (this.unsubscribe) this.unsubscribe();
        this.state.userId = userId;

        // Referencia al documento del usuario
        const userDocRef = doc(db, "users", userId);
        
        // Sincronización en tiempo real
        this.unsubscribe = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                this.state.transactions = data.transactions || [];
                this.state.budgets = data.budgets || {};
                this.state.goals = data.goals || [];
                this.state.customIcons = data.customIcons || {};
                this.state.recurring = data.recurring || [];
                this.state.hiddenCategories = data.hiddenCategories || [];
                
                // Mezclar categorías personalizadas si existen
                if (data.customCats) {
                    this.state.categories.ingreso = [...new Set([...['Salario', 'Negocio', 'Inversiones', 'Freelance', 'Regalos', 'Reembolsos', 'Otros Ingresos'], ...(data.customCats.ingreso || [])])];
                    this.state.categories.gasto = [...new Set([...['Alimentación', 'Vivienda', 'Transporte', 'Entretenimiento', 'Salud', 'Educación', 'Compras', 'Servicios', 'Suscripciones', 'Mascotas', 'Regalos', 'Deudas', 'Seguros', 'Otros Gastos'], ...(data.customCats.gasto || [])])];
                }
                
                App.syncDashboard();
            } else {
                // Si el usuario es nuevo, inicializar documento
                this.saveInitialData();
            }
        });
    },

    async saveInitialData() {
        const userDocRef = doc(db, "users", this.state.userId);
        await setDoc(userDocRef, {
            transactions: [],
            budgets: {},
            goals: [],
            customIcons: {},
            recurring: [],
            hiddenCategories: [],
            customCats: { ingreso: [], gasto: [] }
        });
    },

    async saveAll() {
        if (!this.state.userId) return;
        const userDocRef = doc(db, "users", this.state.userId);
        
        const custom = {
            ingreso: this.state.categories.ingreso.filter(c => !['Salario', 'Negocio', 'Inversiones', 'Freelance', 'Regalos', 'Reembolsos', 'Otros Ingresos'].includes(c)),
            gasto: this.state.categories.gasto.filter(c => !['Alimentación', 'Vivienda', 'Transporte', 'Entretenimiento', 'Salud', 'Educación', 'Compras', 'Servicios', 'Suscripciones', 'Mascotas', 'Regalos', 'Deudas', 'Seguros', 'Otros Gastos'].includes(c))
        };

        try {
            await updateDoc(userDocRef, {
                transactions: this.state.transactions,
                budgets: this.state.budgets,
                goals: this.state.goals,
                customIcons: this.state.customIcons,
                recurring: this.state.recurring,
                hiddenCategories: this.state.hiddenCategories,
                customCats: custom
            });
        } catch (e) {
            console.error("Error saving to Firebase", e);
            if (e.code === 'permission-denied') {
                UIController.showToast('Error de Permisos: Verifica las reglas de tu base de datos Firebase.', 'danger');
                console.warn("TIP: Asegúrate de que las reglas de Firestore permitan escritura para usuarios autenticados: allow read, write: if request.auth != null;");
            } else {
                UIController.showToast('Error al sincronizar con la nube', 'danger');
            }
        }
    },

    addTransaction(t) {
        this.state.transactions.push(t);
        this.saveAll();
    },

    updateTransaction(id, updatedData) {
        const index = this.state.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.state.transactions[index] = { ...this.state.transactions[index], ...updatedData };
            this.saveAll();
        }
    },

    deleteTransaction(id) {
        this.state.transactions = this.state.transactions.filter(t => t.id !== id);
        this.saveAll();
    },

    addCategory(type, catName, icon = null) {
        let changed = false;
        
        // Normalizar para prevenir duplicados ("taxi" vs "Taxi" vs " taxi ")
        const normalizedName = catName.trim();
        const existingMatch = this.state.categories[type].find(
            c => c.toLowerCase() === normalizedName.toLowerCase()
        );
        
        if (existingMatch) {
            // La categoría ya existe (quizá con diferente capitalización)
            catName = existingMatch; // Usar el nombre existente
        } else {
            this.state.categories[type].push(normalizedName);
            catName = normalizedName;
            changed = true;
        }
        
        // Auto-detección si no se provee icono o si queremos asegurar el mejor icono
        if (!icon) {
            const lowerText = catName.toLowerCase();
            for (const [emoji, keywords] of Object.entries(EMOJI_KEYWORDS)) {
                if (keywords.some(k => lowerText.includes(k))) {
                    icon = emoji;
                    break;
                }
            }
        }

        if (icon && this.state.customIcons[catName] !== icon) {
            this.state.customIcons[catName] = icon;
            changed = true;
        }

        if (changed) {
            this.saveAll();
        }
        
        return catName; // Retornar el nombre final (puede ser el existente)
    },

    hideCategory(catName) {
        if (!this.state.hiddenCategories.includes(catName)) {
            this.state.hiddenCategories.push(catName);
            this.saveAll();
        }
    },

    restoreCategory(catName) {
        this.state.hiddenCategories = this.state.hiddenCategories.filter(c => c !== catName);
        this.saveAll();
    },

    deleteCategory(type, catName) {
        this.state.categories[type] = this.state.categories[type].filter(c => c !== catName);
        if (this.state.customIcons[catName]) {
            delete this.state.customIcons[catName];
        }
        this.saveAll();
    },

    setBudget(category, amount, period = 'mensual') {
        this.state.budgets[category] = { amount, period };
        this.saveAll();
    },

    deleteBudget(category) {
        if (this.state.budgets[category]) {
            delete this.state.budgets[category];
            this.saveAll();
        }
    },

    addGoal(title, targetAmount) {
        this.state.goals.push({ 
            id: crypto.randomUUID(), 
            title, 
            target: targetAmount, 
            current: 0,
            logs: [] // Historial de aportes
        });
        this.saveAll();
    },

    deleteGoal(id) {
        this.state.goals = this.state.goals.filter(g => g.id !== id);
        this.saveAll();
    },

    updateGoal(id, title, target) {
        const index = this.state.goals.findIndex(g => g.id === id);
        if (index !== -1) {
            this.state.goals[index].title = title;
            this.state.goals[index].target = target;
            this.saveAll();
        }
    },

    contributeToGoal(id, amount, note = 'Aporte manual') {
        const index = this.state.goals.findIndex(g => g.id === id);
        if (index !== -1) {
            const goal = this.state.goals[index];
            goal.current = (goal.current || 0) + amount;
            
            // Registrar en el historial interno de la meta
            if (!goal.logs) goal.logs = [];
            goal.logs.push({
                id: crypto.randomUUID(),
                date: new Date().toISOString().split('T')[0],
                amount: amount,
                note: note
            });
            
            this.saveAll();
        }
    },

    // Migración opcional de LocalStorage a Firebase
    async migrateFromLocalStorage() {
        const storedDB = localStorage.getItem('finance_pro_db');
        if (storedDB) {
            try {
                const parsed = JSON.parse(storedDB);
                this.state.transactions = parsed.transactions || [];
                this.state.budgets = parsed.budgets || {};
                this.state.goals = parsed.goals || [];
                this.state.recurring = parsed.recurring || [];
                await this.saveAll();
                localStorage.removeItem('finance_pro_db');
                localStorage.removeItem('finance_pro_configs');
                UIController.showToast('Datos locales migrados con éxito', 'success');
            } catch(e) { console.error('Migration failed', e); }
        }
    },

    exportCSV() {
        if(this.state.transactions.length === 0) {
            UIController.showToast('No hay datos para exportar', 'warning');
            return;
        }
        const headers = ["ID", "Fecha", "Tipo", "Categoría", "Monto"];
        const rows = this.state.transactions.map(t => `${t.id},${t.date},${t.type},${t.category},${t.amount}`);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `finance_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        UIController.showToast('Exportación completada', 'success');
    }
};


/* =========================================================
   2. FINANCE ENGINE (Lógica Matemáticas Recurrentes y Estado)
   ========================================================= */
const FinanceEngine = {
    // 1. Estado Global Centralizado (State Management)
    state: {
        filter: 'mes-especifico',
        quincena: 1,
        specificDate: null, // Para filtro de fecha específica (auditoría micro)
        currentMonth: (() => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
        })()
    },

    getFilteredTransactions(transactions, state) {
        if (state.filter === 'todo') {
            return [...transactions];
        }

        const today = new Date();
        today.setHours(0,0,0,0);
        
        return transactions.filter(trx => {
            const d = new Date(trx.date + 'T00:00:00');
            if (state.filter === 'hoy') return d.getTime() === today.getTime();
            if (state.filter === 'fecha-especifica' && state.specificDate) {
                const target = new Date(state.specificDate + 'T00:00:00');
                return d.getTime() === target.getTime();
            }
            if (state.filter === 'semana') {
                const limit = new Date(today); limit.setDate(today.getDate() - 7);
                return d >= limit && d <= today;
            }
            if (state.filter === 'mes-especifico' || state.filter === 'quincena') {
                const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
                if (yearMonth !== state.currentMonth) return false;
                
                if (state.filter === 'quincena') {
                    const isFirstHalf = d.getDate() <= 15;
                    return state.quincena === 1 ? isFirstHalf : !isFirstHalf;
                }
                return true;
            }
            return true;
        });
    },

    getPreviousPeriodTransactions(transactions, state) {
        if (state.filter === 'todo' || state.filter === 'fecha-especifica') return [];

        const today = new Date();
        today.setHours(0,0,0,0);
        
        return transactions.filter(trx => {
            const d = new Date(trx.date + 'T00:00:00');
            if (state.filter === 'hoy') {
                const limit = new Date(today); limit.setDate(today.getDate() - 1);
                return d.getTime() === limit.getTime();
            }
            if (state.filter === 'semana') {
                const start = new Date(today); start.setDate(today.getDate() - 14);
                const end = new Date(today); end.setDate(today.getDate() - 8);
                return d >= start && d <= end;
            }
            if (state.filter === 'mes-especifico' || state.filter === 'quincena') {
                const parts = state.currentMonth.split('-');
                let y = parseInt(parts[0]);
                let m = parseInt(parts[1]) - 1; // 0-indexed
                if (m === 0) { m = 12; y--; }
                const prevYearMonth = `${y}-${String(m).padStart(2,'0')}`;
                const trxYearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
                
                if (state.filter === 'quincena') {
                    // Previous period for quincena 2 is quincena 1 of current month
                    // Previous period for quincena 1 is quincena 2 of previous month
                    if (state.quincena === 2) {
                        return trxYearMonth === state.currentMonth && d.getDate() <= 15;
                    } else {
                        return trxYearMonth === prevYearMonth && d.getDate() > 15;
                    }
                }
                
                return trxYearMonth === prevYearMonth;
            }
            return false;
        });
    },

    // 3. Implementar: calculateMetrics(filteredData) (Cálculos centralizados)
    calculateMetrics(filteredData) {
        return filteredData.reduce((acc, curr) => {
            if (curr.type === 'ingreso') {
                acc.income += curr.amount;
                acc.balance += curr.amount;
            } else {
                acc.expense += curr.amount;
                acc.balance -= curr.amount;
            }
            return acc;
        }, { income: 0, expense: 0, balance: 0 });
    },

    runRecurringChecks() {
        const today = new Date();
        const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}`;
        const currentD = today.getDate();
        
        FinanceEngine.state.pendingRecurring = [];

        DataService.state.recurring.forEach(rec => {
            // Find how many months are pending
            let lastRunD = new Date(rec.lastRunMonth + '-01T00:00:00');
            let todayD = new Date(currentYearMonth + '-01T00:00:00');
            
            let missedMonths = 0;
            let tempD = new Date(lastRunD);
            tempD.setMonth(tempD.getMonth() + 1);
            
            while (tempD <= todayD) {
                if (tempD.getTime() === todayD.getTime() && currentD < rec.day) {
                    break;
                }
                missedMonths++;
                tempD.setMonth(tempD.getMonth() + 1);
            }

            if (missedMonths > 0) {
                FinanceEngine.state.pendingRecurring.push({ 
                    ...rec, 
                    missedCount: missedMonths, 
                    targetMonth: currentYearMonth
                });
            }
        });
        
        // This will be rendered by UIController
        if (typeof UIController !== 'undefined' && UIController.renderRecurringReminders) {
            UIController.renderRecurringReminders();
        }
    },

    registerRecurringConfig(t, todayStr) {
        const dObj = new Date(t.date + 'T00:00:00');
        DataService.state.recurring.push({
            id: crypto.randomUUID(),
            type: t.type,
            amount: t.amount,
            category: t.category,
            day: dObj.getDate(),
            lastRunMonth: todayStr.substring(0, 7) // Ej: "2024-05" 
        });
        DataService.saveAll();
        UIController.showToast('Suscripción guardada para automatización mensual', 'success');
    }
};

/* =========================================================
   3. ANALYTICS (Presupuestos, Metas y Asistente Visión)
   ========================================================= */
const Analytics = {
    getBudgetStatuses(transactions, state) {
        let currentYear, currentMonth;
        const now = new Date();
        if (state.filter === 'mes-especifico') {
            const parts = state.currentMonth.split('-');
            currentYear = parseInt(parts[0]);
            currentMonth = parseInt(parts[1]) - 1;
        } else {
            currentMonth = now.getMonth();
            currentYear = now.getFullYear();
        }

        const isCurrentPeriod = (now.getMonth() === currentMonth && now.getFullYear() === currentYear);
        const currentDay = now.getDate();
        const currentQuincena = currentDay <= 15 ? 1 : 2;

        const result = [];
        for (const [cat, budgetInfo] of Object.entries(DataService.state.budgets)) {
            const limit = typeof budgetInfo === 'object' ? budgetInfo.amount : budgetInfo;
            const period = typeof budgetInfo === 'object' ? budgetInfo.period : 'mensual';

            let spent = 0;
            let activeQ = null;

            if (period === 'quincenal') {
                activeQ = isCurrentPeriod ? currentQuincena : 1;
                spent = transactions.filter(t => {
                    if (t.type !== 'gasto' || t.category !== cat) return false;
                    const d = new Date(t.date + 'T00:00:00');
                    if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;
                    const tQ = d.getDate() <= 15 ? 1 : 2;
                    return tQ === activeQ;
                }).reduce((sum, t) => sum + t.amount, 0);
            } else {
                spent = transactions.filter(t => {
                    if (t.type !== 'gasto' || t.category !== cat) return false;
                    const d = new Date(t.date + 'T00:00:00');
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                }).reduce((sum, t) => sum + t.amount, 0);
            }

            const percentage = limit > 0 ? (spent / limit) * 100 : 0;
            let status = 'en_control';
            if (percentage >= 100) status = 'excedido';
            else if (percentage >= 80) status = 'riesgo';
            
            result.push({ 
                category: cat, 
                spent, 
                limit, 
                percentage, 
                period,
                quincena: activeQ,
                status
            });
        }
        return result;
    },

    generatePlanningInsights(budgetStatuses, savingCapacity) {
        const insights = [];
        
        // 1. Presupuestos Excedidos
        const exceeded = budgetStatuses.filter(b => b.status === 'excedido');
        if (exceeded.length > 0) {
            const worst = exceeded.sort((a,b) => (b.spent - b.limit) - (a.spent - a.limit))[0];
            const excess = worst.spent - worst.limit;
            insights.push({ icon: '🚨', text: `<strong>${worst.category}</strong> supera el presupuesto por <strong>${formatCOP.format(excess)}</strong>. Esto impacta tu capacidad de ahorro.`, type: 'danger' });
        }

        // 2. Presupuestos en Riesgo
        const atRisk = budgetStatuses.filter(b => b.status === 'riesgo');
        if (atRisk.length > 0) {
            const riskCat = atRisk[0];
            const rem = riskCat.limit - riskCat.spent;
            insights.push({ icon: '⚠️', text: `Mantén un ojo en <strong>${riskCat.category}</strong>. Solo te quedan <strong>${formatCOP.format(rem)}</strong> para este periodo.`, type: 'warning' });
        }

        // 3. Oportunidad de ahorro
        if (savingCapacity > 0) {
            const activeGoals = DataService.state.goals.filter(g => (g.current || 0) < g.target);
            if (activeGoals.length > 0) {
                // Sugerir aportar a la de mayor progreso (efecto bola de nieve)
                const closest = activeGoals.sort((a,b) => ((b.current||0)/b.target) - ((a.current||0)/a.target))[0];
                insights.push({ icon: '💡', text: `Tienes <strong>${formatCOP.format(savingCapacity)}</strong> disponibles. Podrías aportar a tu meta <strong>"${closest.title}"</strong> para acelerarla.`, type: 'info' });
            } else {
                insights.push({ icon: '💸', text: `Excelente gestión. Tienes <strong>${formatCOP.format(savingCapacity)}</strong> de excedente. ¡Es un buen momento para crear un nuevo objetivo de ahorro!`, type: 'success' });
            }
        } else if (DataService.state.goals.length > 0) {
             insights.push({ icon: '⏸️', text: `Tu capacidad de ahorro actual es <strong>$0</strong>. Trata de no afectar más tus presupuestos para no frenar tus metas.`, type: 'warning' });
        }

        return insights;
    },

    calculateVariations(current, prev) {
        const getTrend = (c, p) => {
            const diff = c - p;
            if (p === 0) return { percentage: c > 0 ? 100 : 0, absolute: diff };
            return { percentage: (diff / Math.abs(p)) * 100, absolute: diff };
        };
        return {
            income: getTrend(current.income, prev.income),
            expense: getTrend(current.expense, prev.expense),
            balance: getTrend(current.balance, prev.balance)
        };
    },

    generateInsights(filteredData, metrics, prevMetrics) {
        if(filteredData.length === 0) return [{ icon: '🌟', text: 'Sin actividad registrada en este periodo. Planifica tus próximos movimientos.', type: 'health', severity: 'info' }];
        
        const insights = [];
        const expenses = filteredData.filter(x => x.type === 'gasto');
        const state = FinanceEngine.state;
        
        // Calcular días del periodo para promedios
        let daysCount = 1;
        const now = new Date();
        if (state.filter === 'mes-especifico') {
            const [y, m] = state.currentMonth.split('-');
            const lastDay = new Date(y, m, 0).getDate();
            const isCurrentMonth = (now.getFullYear() == y && (now.getMonth() + 1) == m);
            daysCount = isCurrentMonth ? now.getDate() : lastDay;
        } else if (state.filter === 'semana') daysCount = 7;
        else if (state.filter === 'quincena') daysCount = 15;
        else if (state.filter === 'hoy') daysCount = 1;

        const dailyAvg = metrics.expense / daysCount;
        const prevDailyAvg = prevMetrics ? (prevMetrics.expense / (state.filter === 'mes-especifico' ? 30 : daysCount)) : 0;

        // --- INSIGHT: Alerta de Déficit (severity: critical) ---
        if (metrics.balance < 0) {
            // Cruce con categorías: identificar la categoría que más contribuye al déficit
            const catSpent = expenses.reduce((a, b) => { a[b.category] = (a[b.category]||0) + b.amount; return a; }, {});
            const topCat = Object.entries(catSpent).sort((a,b) => b[1] - a[1])[0];
            let deficitText = `Tus gastos superan tus ingresos por <strong>${formatCOP.format(Math.abs(metrics.balance))}</strong> en este periodo.`;
            if (topCat) {
                const topPerc = ((topCat[1] / metrics.expense) * 100).toFixed(0);
                deficitText += ` Revisa <strong>${topCat[0]}</strong> (${topPerc}% del gasto total) en el módulo de Presupuestos.`;
            }
            insights.push({ 
                icon: '🚨', 
                type: 'alert',
                severity: 'critical',
                text: deficitText
            });
        }

        // --- INSIGHT: Alertas de Presupuesto (severity: warning) ---
        const budgetStatuses = Analytics.getBudgetStatuses(DataService.state.transactions, state);
        budgetStatuses.forEach(b => {
            if (b.percentage >= 100) {
                insights.push({
                    icon: '🔴',
                    type: 'alert',
                    severity: 'critical',
                    text: `<strong>${b.category}</strong> ha superado su presupuesto mensual: <strong>${formatCOP.format(b.spent)}</strong> de ${formatCOP.format(b.limit)} (${b.percentage.toFixed(0)}%).`
                });
            } else if (b.percentage >= 80) {
                insights.push({
                    icon: '⚠️',
                    type: 'alert',
                    severity: 'warning',
                    text: `<strong>${b.category}</strong> está al <strong>${b.percentage.toFixed(0)}%</strong> de su límite mensual (${formatCOP.format(b.spent)} de ${formatCOP.format(b.limit)}). Modera el gasto restante.`
                });
            }
        });

        // --- INSIGHT: Proyección (severity: warning si excede, info si no) ---
        if (state.filter === 'mes-especifico') {
            const [y, m] = state.currentMonth.split('-');
            if (now.getFullYear() == y && (now.getMonth() + 1) == m) {
                const lastDay = new Date(y, m, 0).getDate();
                const projection = dailyAvg * lastDay;
                const exceedsIncome = projection > metrics.income && metrics.income > 0;
                insights.push({ 
                    icon: '🔮', 
                    type: exceedsIncome ? 'alert' : 'opportunity',
                    severity: exceedsIncome ? 'warning' : 'info',
                    text: `A este ritmo, cerrarás el mes con un gasto estimado de <strong>${formatCOP.format(projection)}</strong>.${exceedsIncome ? ' Esto superaría tus ingresos del periodo.' : ''}`
                });
            }
        }

        // --- INSIGHT: Gasto Diario (severity: info o warning) ---
        if (dailyAvg > 0) {
            let avgText = `Tu gasto promedio diario es de <strong>${formatCOP.format(dailyAvg)}</strong>.`;
            let avgSeverity = 'info';
            if (prevDailyAvg > 0) {
                const avgDiff = ((dailyAvg - prevDailyAvg) / prevDailyAvg * 100).toFixed(0);
                if (avgDiff > 5) {
                    avgText += ` Esto es un <strong>${avgDiff}% superior</strong> al periodo anterior.`;
                    avgSeverity = 'warning';
                } else if (avgDiff < -5) {
                    avgText += ` ¡Genial! Has reducido tu promedio diario un <strong>${Math.abs(avgDiff)}%</strong>.`;
                    avgSeverity = 'positive';
                }
            }
            insights.push({ icon: '📅', type: dailyAvg > prevDailyAvg ? 'alert' : 'health', severity: avgSeverity, text: avgText });
        }

        // --- INSIGHT: Categoría Dominante con acción concreta (severity: info) ---
        if (expenses.length > 0) {
            const catSpent = expenses.reduce((a, b) => { a[b.category] = (a[b.category]||0) + b.amount; return a; }, {});
            const sortedCats = Object.entries(catSpent).sort((a,b) => b[1] - a[1]);
            const maxEntry = sortedCats[0];
            const perc = ((maxEntry[1] / metrics.expense) * 100).toFixed(0);
            // Cruce con presupuestos: verificar si tiene límite
            const hasBudget = DataService.state.budgets[maxEntry[0]];
            let catText = `<strong>${maxEntry[0]}</strong> concentra el <strong>${perc}%</strong> de tu gasto total (${formatCOP.format(maxEntry[1])}).`;
            if (!hasBudget) {
                catText += ` Considera establecer un presupuesto para esta categoría en el módulo de Planeación.`;
            }
            insights.push({ 
                icon: '📊', 
                type: 'opportunity',
                severity: 'info',
                text: catText
            });
        }

        // --- INSIGHT: Tasa de Ahorro + Sugerencia a Meta (severity: positive) ---
        if (metrics.balance > 0 && metrics.income > 0) {
            const savingRate = ((metrics.balance / metrics.income) * 100).toFixed(0);
            let savingText = `Mantienes una <strong>tasa de ahorro del ${savingRate}%</strong>.`;
            
            // Cruce con Metas: si hay meta activa, sugerir aporte con impacto cuantificado
            const activeMetas = DataService.state.goals.filter(g => (g.current || 0) < g.target);
            if (activeMetas.length > 0) {
                const topMeta = activeMetas[0];
                const remaining = topMeta.target - (topMeta.current || 0);
                const suggestedAmount = Math.min(metrics.balance, remaining);
                const newProgress = (((topMeta.current || 0) + suggestedAmount) / topMeta.target * 100).toFixed(0);
                savingText += ` Con tu excedente de <strong>${formatCOP.format(metrics.balance)}</strong> podrías aportar a tu meta "<strong>${topMeta.title}</strong>" y llevarla al <strong>${newProgress}%</strong>.`;
            } else {
                savingText += ` Vas por buen camino. Considera crear una meta de ahorro para reservar este capital.`;
            }
            
            insights.push({ 
                icon: '💎', 
                type: 'health',
                severity: 'positive',
                text: savingText
            });
        }

        // Ordenar por severidad: critical → warning → info → positive
        const severityOrder = { critical: 0, warning: 1, info: 2, positive: 3 };
        insights.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

        return insights;
    }
};

/* =========================================================
   4. UI CONTROLLER (Gestión del Documento Document Object Model)
   ========================================================= */
const UIController = {
    charCat: null,
    charDate: null,
    charIncExp: null,
    charBalTrend: null,
    charRank: null,
    transactionToDelete: null,
    editingId: null,

    setupAmountFormatting(id) {
        const input = document.getElementById(id);
        if (!input) return;

        input.addEventListener('input', (e) => {
            // Remove any non-digit character
            let value = e.target.value.replace(/\D/g, '');
            if (value === "") {
                e.target.value = "";
                return;
            }
            // Format with dots for thousands (es-CO standard)
            e.target.value = new Intl.NumberFormat('es-CO').format(parseInt(value));
        });
    },

    parseAmount(val) {
        if (typeof val !== 'string') return val;
        // Eliminar puntos (separador de miles) y cambiar coma por punto (decimal) para parsing estándar
        return parseFloat(val.replace(/\./g, '').replace(/,/g, '.')) || 0;
    },

    getIconForCategory(cat) {
        // 1. Buscar en iconos personalizados guardados
        if (DataService.state.customIcons && DataService.state.customIcons[cat]) {
            return DataService.state.customIcons[cat];
        }

        // 2. Mapa predefinido
        const icons = {
            'Alimentación':'🍔', 'Vivienda':'🏠', 'Transporte':'🚕', 'Entretenimiento':'🍿', 'Salud':'💊', 'Educación':'📚', 'Compras':'🛍️', 'Servicios':'💡', 'Suscripciones':'📺', 'Mascotas':'🐾', 'Deudas':'💳', 'Seguros':'🛡️', 'Salario':'💵', 'Inversiones':'📈', 'Freelance':'💻', 'Regalos':'🎁', 'Reembolsos':'💸',
            'Gasolina': '⛽'
        };
        return icons[cat] || '🏷️';
    },

    openAddCategoryModal() {
        const modal = document.getElementById('category-modal');
        const input = document.getElementById('new-cat-name');
        const select = document.getElementById('new-cat-emoji');
        
        input.value = '';
        select.value = '❓';
        modal.classList.remove('hidden');
        input.focus();
    },

    setupCategoryAutoDetection(text) {
        if (!text) return;
        const lowerText = text.toLowerCase().trim();
        const select = document.getElementById('new-cat-emoji');
        let matchedEmoji = null;
        
        // 1. Intentar coincidencia inteligente por palabras clave
        for (const [emoji, keywords] of Object.entries(EMOJI_KEYWORDS)) {
            if (keywords.some(k => lowerText.includes(k))) {
                matchedEmoji = emoji;
                break;
            }
        }

        // 2. Si no hay coincidencia, asignar uno del Pool General (Garantía de Icono)
        if (!matchedEmoji && lowerText.length > 2) {
            const fallbackPool = ['💎', '🌟', '🏷️', '📦', '💸', '✨', '🔥', '🌈', '🍀', '💠', '🧿', '🧬', '🔮'];
            // Algoritmo de hash simple para que la misma palabra siempre dé el mismo emoji
            let hash = 0;
            for (let i = 0; i < lowerText.length; i++) {
                hash = ((hash << 5) - hash) + lowerText.charCodeAt(i);
                hash |= 0;
            }
            const index = Math.abs(hash) % fallbackPool.length;
            matchedEmoji = fallbackPool[index];
        }

        if (matchedEmoji) {
            // Verificar si el emoji ya existe en el select
            let exists = false;
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === matchedEmoji) {
                    exists = true;
                    break;
                }
            }
            
            // Si no existe, agregarlo dinámicamente para que sea visible
            if (!exists) {
                const newOpt = new Option(`${matchedEmoji} Sugerido`, matchedEmoji);
                // Insertar después de la opción "Otro"
                select.add(newOpt, select.options[1]);
            }
            
            select.value = matchedEmoji;
        }
    },

    handleSaveCategory() {
        const nameInput = document.getElementById('new-cat-name');
        const emojiSelect = document.getElementById('new-cat-emoji');
        const name = nameInput.value.trim();
        let emoji = emojiSelect.value;

        if (!name) {
            this.showToast('Ingresa un nombre para la categoría', 'warning');
            return;
        }

        const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        const type = this.pendingCategoryType || 'gasto';

        // Fallback: Si el emoji es el de interrogación, intentar auto-detectar de nuevo antes de guardar
        if (emoji === '❓' || emoji === '?') {
            const lowerText = formattedName.toLowerCase();
            for (const [e, keywords] of Object.entries(EMOJI_KEYWORDS)) {
                if (keywords.some(k => lowerText.includes(k))) {
                    emoji = e;
                    break;
                }
            }
        }

        DataService.addCategory(type, formattedName, emoji);
        document.getElementById('category-modal').classList.add('hidden');
        
        // Actualizar formulario de transacción
        const selectCat = document.getElementById('category');
        if (selectCat) selectCat.value = formattedName;
        
        // Re-renderizar UI completa para asegurar sincronización
        App.syncDashboard();
        
        // Disparar cambio de tipo para forzar que el grid de categorías se refresque
        const typeSelect = document.getElementById('type');
        if (typeSelect) {
            typeSelect.dispatchEvent(new Event('change'));
        }
        
        this.showToast(`Categoría "${formattedName}" guardada con éxito ✨`, 'success');
    },

    triggerBudgetPrediction() {
        const amountStr = document.getElementById('amount').value;
        const cat = document.getElementById('category').value;
        const warning = document.getElementById('budget-warning');
        const isGasto = document.getElementById('type').value === 'gasto';
        
        const currentAmount = this.parseAmount(amountStr);
        if(!isGasto || !amountStr || isNaN(currentAmount) || cat === 'Otra' || !warning) {
            if(warning) warning.classList.add('hidden'); 
            return;
        }
        
        const limit = DataService.state.budgets[cat];
        if(limit) {
            const spentMap = Analytics.getBudgetStatuses(DataService.state.transactions, FinanceEngine.state).find(s => s.category === cat);
            const currentSpent = spentMap ? spentMap.spent : 0;
            if ((currentSpent + currentAmount) > limit) {
                warning.textContent = `⚠️ Este gasto superará tu límite mensual en ${cat} (${formatCOP.format(limit)})`;
                warning.className = 'inline-alert warning';
                warning.classList.remove('hidden');
            } else { warning.classList.add('hidden'); }
        } else { warning.classList.add('hidden'); }
    },

    initListeners() {
        // --- Amount Formatting (Visual Experience) ---
        this.setupAmountFormatting('amount');
        this.setupAmountFormatting('budget-amount');
        this.setupAmountFormatting('goal-amount');
        this.setupAmountFormatting('sim-amount');

        // --- Auth forms FIRST (highest priority) ---
        try {
            this.bindAuthForms();
        } catch (error) {
            console.error("Error inicializando Auth listeners:", error);
        }

        // --- Transaction & Planning forms ---
        try {
            this.bindTransactionForm();
        } catch (error) {
            console.error("Error inicializando Transaction listeners:", error);
        }

        try {
            this.bindPlanningForms();
        } catch (error) {
            console.error("Error inicializando Planning listeners:", error);
        }

        try {
            // Navegación Tabs
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetId = e.currentTarget.dataset.tab;
                    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    
                    document.getElementById(targetId).classList.add('active');
                    e.currentTarget.classList.add('active');
                    
                    if(targetId === 'tab-analisis') this.renderCharts(FinanceEngine.getFilteredTransactions(DataService.state.transactions, FinanceEngine.state));
                });
            });

            // Filtrado Temporal Data
            document.querySelectorAll('.btn-filter').forEach(btn => {
                if(btn.id === 'btn-q1' || btn.id === 'btn-q2') return;
                btn.addEventListener('click', (e) => {
                    // Evitar que el clic en el input date propague al botón
                    if (e.target.tagName === 'INPUT') return;
                    document.querySelectorAll('.filter-group:not(.quincena-selector-wrapper .filter-group) .btn-filter').forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    const filterValue = e.currentTarget.dataset.filter;
                    
                    if (filterValue === 'fecha-especifica') {
                        // Abrir el date picker
                        const datePicker = document.getElementById('specific-date-picker');
                        if (datePicker) {
                            if (datePicker.showPicker) datePicker.showPicker();
                            else datePicker.click();
                        }
                        return; // No actualizar UI aún, esperar a que se seleccione fecha
                    }
                    
                    FinanceEngine.state.filter = filterValue;
                    this.updateUI();
                });
            });

            // Filtro Fecha Específica (Auditoría Micro)
            const specificDatePicker = document.getElementById('specific-date-picker');
            if (specificDatePicker) {
                specificDatePicker.addEventListener('change', (e) => {
                    e.stopPropagation();
                    if (e.target.value) {
                        FinanceEngine.state.specificDate = e.target.value;
                        FinanceEngine.state.filter = 'fecha-especifica';
                        // Marcar botón activo
                        document.querySelectorAll('.filter-group:not(.quincena-selector-wrapper .filter-group) .btn-filter').forEach(b => b.classList.remove('active'));
                        document.getElementById('btn-filter-date').classList.add('active');
                        this.updateUI();
                    }
                });
            }

            // Filtro Sub-Quincena
            const btnQ1 = document.getElementById('btn-q1');
            const btnQ2 = document.getElementById('btn-q2');
            if (btnQ1 && btnQ2) {
                btnQ1.addEventListener('click', () => { btnQ1.classList.add('active'); btnQ2.classList.remove('active'); FinanceEngine.state.quincena = 1; this.updateUI(); });
                btnQ2.addEventListener('click', () => { btnQ2.classList.add('active'); btnQ1.classList.remove('active'); FinanceEngine.state.quincena = 2; this.updateUI(); });
            }

            // Onboarding Finish
            const btnFinishOnboarding = document.getElementById('btn-finish-onboarding');
            if (btnFinishOnboarding) {
                btnFinishOnboarding.addEventListener('click', () => {
                    localStorage.setItem('finance_onboarding_done', 'true');
                    document.getElementById('onboarding-modal').classList.add('hidden');
                    UIController.showToast('¡Onboarding completado! Bienvenido.', 'success');
                });
            }

            // Global Empty State CTA
            const btnGotoRegister = document.getElementById('btn-goto-register');
            if (btnGotoRegister) {
                btnGotoRegister.addEventListener('click', () => {
                    document.querySelector('.tab-btn[data-tab="tab-registro"]').click();
                    setTimeout(() => {
                        const amountInput = document.getElementById('amount');
                        if (amountInput) amountInput.focus();
                    }, 100);
                });
            }

            // Navegación Modular De Meses
            const offsetMonth = (offset) => {
                const [y, m] = FinanceEngine.state.currentMonth.split('-');
                let nd = new Date(y, parseInt(m)-1 + offset, 1);
                FinanceEngine.state.currentMonth = `${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}`;
                this.updateUI();
            };

            const prevBtn = document.getElementById('btn-prev-month');
            if (prevBtn) prevBtn.addEventListener('click', () => offsetMonth(-1));

            const nextBtn = document.getElementById('btn-next-month');
            if (nextBtn) nextBtn.addEventListener('click', () => offsetMonth(1));

            const picker = document.getElementById('month-picker');
            if (picker) {
                picker.addEventListener('change', (e) => {
                    if(e.target.value) { FinanceEngine.state.currentMonth = e.target.value; this.updateUI(); }
                });
                document.getElementById('current-month-display').addEventListener('click', () => {
                    if (picker.showPicker) picker.showPicker();
                    else picker.click();
                });
            }

            // Modales y Period Summary
            const btnSummary = document.getElementById('btn-period-summary');
            if(btnSummary) btnSummary.addEventListener('click', () => this.openPeriodSummary());
            
            const btnCloseSummary = document.getElementById('btn-close-summary');
            if(btnCloseSummary) btnCloseSummary.addEventListener('click', () => {
                document.getElementById('period-summary-modal').classList.add('hidden');
            });

            const btnCancelDel = document.getElementById('btn-cancel-delete');
            if (btnCancelDel) btnCancelDel.addEventListener('click', () => {
                document.getElementById('delete-modal').classList.add('hidden');
                this.transactionToDelete = null;
            });
            const btnConfirmDel = document.getElementById('btn-confirm-delete');
            if (btnConfirmDel) btnConfirmDel.addEventListener('click', () => {
                if(this.transactionToDelete) {
                    DataService.deleteTransaction(this.transactionToDelete);
                    App.syncDashboard();
                    document.getElementById('delete-modal').classList.add('hidden');
                    this.showToast('Registro eliminado con éxito.', 'success');
                }
            });

            // CSV Export
            const btnExport = document.getElementById('btn-export-csv');
            if (btnExport) btnExport.addEventListener('click', () => DataService.exportCSV());

            // Delegación de eventos para botones dinámicos (Edit/Delete)
            document.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete')) {
                    const id = e.target.closest('.btn-delete').dataset.id;
                    this.promptDelete(id);
                }
                if (e.target.closest('.btn-edit')) {
                    const id = e.target.closest('.btn-edit').dataset.id;
                    this.startEdit(id);
                }
                // Delegación para metas
                if (e.target.closest('.btn-goal-delete')) {
                    const id = e.target.closest('.btn-goal-delete').dataset.id;
                    this.promptGoalDelete(id);
                }
                if (e.target.closest('.btn-goal-edit')) {
                    const id = e.target.closest('.btn-goal-edit').dataset.id;
                    this.promptGoalEdit(id);
                }
                if (e.target.closest('.btn-goal-contribute')) {
                    const id = e.target.closest('.btn-goal-contribute').dataset.id;
                    this.promptGoalContribute(id);
                }
                // Delegación para presupuestos
                if (e.target.closest('.btn-budget-delete')) {
                    const cat = e.target.closest('.btn-budget-delete').dataset.cat;
                    this.promptBudgetDelete(cat);
                }
                if (e.target.closest('.btn-budget-edit')) {
                    const cat = e.target.closest('.btn-budget-edit').dataset.cat;
                    this.promptBudgetEdit(cat);
                }
            });

            // Modal Categoría Inteligente
            const btnCancelCat = document.getElementById('btn-cancel-category');
            if(btnCancelCat) btnCancelCat.addEventListener('click', () => document.getElementById('category-modal').classList.add('hidden'));

            const btnSaveCat = document.getElementById('btn-save-category');
            if(btnSaveCat) btnSaveCat.addEventListener('click', () => this.handleSaveCategory());

            const catNameInput = document.getElementById('new-cat-name');
            if(catNameInput) catNameInput.addEventListener('input', (e) => this.setupCategoryAutoDetection(e.target.value));

            const btnCancelEdit = document.getElementById('btn-cancel-edit');
            if (btnCancelEdit) btnCancelEdit.addEventListener('click', () => this.cancelEdit());
        } catch (error) {
            console.error("Error inicializando UI listeners:", error);
        }
    },

    bindAuthForms() {
        const authForm = document.getElementById('auth-form');
        if (!authForm) return;

        // CRITICAL FIX: Disable native HTML5 validation on the auth form.
        // Native validation silently blocks the submit event when required fields
        // are empty or invalid, without showing visible feedback in many contexts.
        // We perform manual validation inside the submit handler instead.
        authForm.setAttribute('novalidate', 'true');

        const authTitle = document.getElementById('auth-title');
        const authSubtitle = document.getElementById('auth-subtitle');
        const btnMain = document.getElementById('btn-auth-main');
        const btnGoogleLogin = document.getElementById('btn-google-login');
        const btnToggle = document.getElementById('btn-toggle-auth');
        
        const emailInput = document.getElementById('auth-email');
        const passInput = document.getElementById('auth-password');
        
        let isRegister = false;


        const btnForgotPassword = document.getElementById('btn-forgot-password');

        const updateAuthUI = () => {
            authTitle.textContent = 'Finance App';
            authSubtitle.textContent = isRegister ? 'Únete y toma el control de tus finanzas' : 'Inicia sesión para proteger tus finanzas';
            btnMain.textContent = isRegister ? 'Crear Cuenta' : 'Iniciar Sesión';
            btnToggle.textContent = isRegister ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate';
            if (btnForgotPassword) btnForgotPassword.style.display = isRegister ? 'none' : 'block';
        };


        btnToggle.addEventListener('click', () => {
            isRegister = !isRegister;
            updateAuthUI();
        });




        btnGoogleLogin.addEventListener('click', async () => {
            this.setLoading('btn-google-login', true);
            const provider = new GoogleAuthProvider();
            try {
                btnGoogleLogin.innerHTML = 'Redirigiendo a Google...';
                await signInWithRedirect(auth, provider);
                // No se ejecuta código abajo por el redireccionamiento
            } catch (error) {
                console.error("Error Google Login Redirect:", error);
                const msg = this.getAuthErrorMessage(error);
                this.showToast(msg, 'danger');
                this.setLoading('btn-google-login', false);
                btnGoogleLogin.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continuar con Google
                `;
            }
        });

        if (btnForgotPassword) {
            btnForgotPassword.addEventListener('click', async () => {
                const email = emailInput.value.trim();
                if (!email) {
                    this.showToast('Ingresa tu correo para poder enviarte el enlace de restablecimiento.', 'warning');
                    emailInput.focus();
                    return;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    this.showToast('Por favor ingresa un correo electrónico válido', 'warning');
                    emailInput.focus();
                    return;
                }

                this.setLoading('btn-forgot-password', true);
                try {
                    await sendPasswordResetEmail(auth, email);
                    this.showToast('Te hemos enviado un correo para restablecer tu contraseña. Revisa en SPAM también.', 'success');
                } catch (error) {
                    console.error("Error Reset Password:", error);
                    const userMsg = this.getAuthErrorMessage(error);
                    this.showToast(userMsg, 'danger');
                } finally {
                    this.setLoading('btn-forgot-password', false);
                }
            });
        }

        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // --- Manual validation (replaces native HTML5 validation) ---
                const email = emailInput.value.trim();
                const password = passInput.value.trim();
                if (!email) {
                    this.showToast('Por favor ingresa tu correo electrónico', 'warning');
                    emailInput.focus();
                    return;
                }
                // Basic email format check
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    this.showToast('Por favor ingresa un correo electrónico válido', 'warning');
                    emailInput.focus();
                    return;
                }
                if (!password) {
                    this.showToast('Por favor ingresa tu contraseña', 'warning');
                    passInput.focus();
                    return;
                }
                if (isRegister && password.length < 6) {
                    this.showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
                    passInput.focus();
                    return;
                }


            this.setLoading('btn-auth-main', true);

            try {
                    const email = emailInput.value.trim();
                    const password = passInput.value.trim();

                    if (isRegister) {
                        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                        // Enviar correo de verificación al nuevo usuario
                        try {
                            await sendEmailVerification(userCredential.user);
                            this.showToast('¡Cuenta creada con éxito! Te enviamos un correo de verificación. Revisa tu bandeja y SPAM. 🎉', 'success');
                        } catch (verifyError) {
                            console.warn('No se pudo enviar el correo de verificación:', verifyError);
                            this.showToast('¡Cuenta creada con éxito! Bienvenido/a 🎉', 'success');
                        }

                    } else {
                        await signInWithEmailAndPassword(auth, email, password);
                        this.showToast('¡Bienvenido/a de nuevo! 🎉', 'success');
                    }

            } catch (error) {
                console.error("Auth Error:", error);
                const userMsg = this.getAuthErrorMessage(error);
                this.showToast(userMsg, 'danger');
            } finally {
                this.setLoading('btn-auth-main', false);
            }
        });

        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                signOut(auth).then(() => {
                    this.showToast('Sesión cerrada', 'warning');
                    location.reload();
                });
            });
        }
    },

    // Centralized Firebase auth error translator
    getAuthErrorMessage(error) {
        const errorMap = {
            'auth/invalid-email': 'El formato del correo electrónico no es válido.',
            'auth/wrong-password': 'Contraseña incorrecta. Inténtalo de nuevo.',
            'auth/invalid-credential': 'Credenciales inválidas. Verifica tu correo y contraseña.',
            'auth/user-not-found': 'No existe una cuenta con este correo electrónico.',
            'auth/email-already-in-use': 'Este correo ya está registrado. Intenta iniciar sesión.',
            'auth/weak-password': 'La contraseña es muy débil. Usa al menos 6 caracteres.',
            'auth/too-many-requests': 'Demasiados intentos fallidos. Espera un momento antes de reintentar.',
            'auth/network-request-failed': 'Error de conexión. Verifica tu acceso a internet.',
            'auth/popup-closed-by-user': 'Ventana emergente cerrada. Inténtalo de nuevo.',
            'auth/popup-blocked': 'Tu navegador bloqueó la ventana emergente. Permite pop-ups e intenta de nuevo.',
            'auth/operation-not-allowed': 'Este método de autenticación no está habilitado en el servidor.',
        };
        return errorMap[error.code] || error.message || 'Error inesperado en la autenticación. Intenta de nuevo.';
    },

    bindTransactionForm() {
        const form = document.getElementById('transaction-form');
        const selectCat = document.getElementById('category');
        const customCat = document.getElementById('custom-category');
        const selectType = document.getElementById('type');

        const populateCategories = () => {
            const hiddenSet = new Set(DataService.state.hiddenCategories || []);
            const list = DataService.state.categories[selectType.value].filter(c => !hiddenSet.has(c));
            const grid = document.getElementById('category-grid');
            if(!grid) return;
            grid.innerHTML = '';

            const baseIngreso = ['Salario', 'Negocio', 'Inversiones', 'Freelance', 'Regalos', 'Reembolsos', 'Otros Ingresos'];
            const baseGasto = ['Alimentación', 'Vivienda', 'Transporte', 'Entretenimiento', 'Salud', 'Educación', 'Compras', 'Servicios', 'Suscripciones', 'Mascotas', 'Regalos', 'Deudas', 'Seguros', 'Otros Gastos'];
            const baseList = selectType.value === 'ingreso' ? baseIngreso : baseGasto;
            
            list.forEach(c => {
                const div = document.createElement('div');
                div.className = 'category-item';
                div.dataset.value = c;
                
                const isBase = baseList.includes(c);
                const deleteBtnHtml = `<span class="btn-delete-cat" data-cat="${c}" data-base="${isBase}">❌</span>`;

                div.innerHTML = `${deleteBtnHtml}<span class="cat-icon">${this.getIconForCategory(c)}</span><span class="cat-name">${c}</span>`;
                grid.appendChild(div);
            });
            
            const otra = document.createElement('div');
            otra.className = 'category-item'; otra.dataset.value = 'Otra';
            otra.innerHTML = `<span class="cat-icon">➕</span><span class="cat-name">Otra</span>`;
            grid.appendChild(otra);

            grid.querySelectorAll('.category-item').forEach(item => {
                // Attach delete button handler
                const delBtn = item.querySelector('.btn-delete-cat');
                if (delBtn) {
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); 
                        const catToDel = e.currentTarget.dataset.cat;
                        const isBase = e.currentTarget.dataset.base === 'true';
                        
                        if (isBase) {
                            if (confirm(`¿Deseas ocultar esta categoría de tu panel?`)) {
                                DataService.hideCategory(catToDel);
                                populateCategories();
                            }
                        } else {
                            if (confirm(`¿Eliminar esta categoría permanentemente?`)) {
                                DataService.deleteCategory(selectType.value, catToDel);
                                populateCategories();
                            }
                        }
                    });
                }

                item.addEventListener('click', (e) => {
                    grid.querySelectorAll('.category-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    selectCat.value = item.dataset.value;
                    this.triggerBudgetPrediction();
                    
                    if(item.dataset.value === 'Otra') { 
                        this.pendingCategoryType = selectType.value;
                        this.openAddCategoryModal(); 
                    }
                    else { customCat.classList.add('hidden'); customCat.required = false; customCat.value=''; }
                });
            });
            
            // Manejo de la UI de Restauración
            const restoreWrapper = document.getElementById('restore-categories-wrapper');
            const hiddenGrid = document.getElementById('hidden-categories-grid');
            const restoreContainer = document.getElementById('restore-grid-container');

            if (restoreWrapper && hiddenGrid) {
                // Identificar ocultas del tipo actual
                const hiddenOfCurrentType = DataService.state.hiddenCategories.filter(c => 
                    DataService.state.categories[selectType.value].includes(c)
                );

                if (hiddenOfCurrentType.length > 0) {
                    restoreWrapper.classList.remove('hidden');
                    hiddenGrid.innerHTML = '';
                    
                    hiddenOfCurrentType.forEach(c => {
                        const div = document.createElement('div');
                        div.className = 'category-item';
                        div.title = "Restaurar categoría";
                        div.innerHTML = `
                            <span class="btn-restore-cat" style="position:absolute; top:-4px; right:-4px; background:rgba(16, 185, 129, 0.9); font-size:0.6rem; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: all 0.2s ease;">🔄</span>
                            <span class="cat-icon" style="opacity:0.6;">${this.getIconForCategory(c)}</span>
                            <span class="cat-name">${c}</span>
                        `;
                        hiddenGrid.appendChild(div);

                        const btnRestore = div.querySelector('.btn-restore-cat');
                        btnRestore.addEventListener('click', (e) => {
                            e.stopPropagation();
                            DataService.restoreCategory(c);
                            populateCategories();
                        });
                        
                        div.addEventListener('click', () => btnRestore.click());
                    });
                } else {
                    restoreWrapper.classList.add('hidden');
                    if (restoreContainer) restoreContainer.classList.add('hidden');
                }
            }
            
            if(grid.firstChild) grid.firstChild.click();
        };

        // Static listener for the toggle button
        const btnToggleRestore = document.getElementById('btn-toggle-restore');
        if (btnToggleRestore) {
            btnToggleRestore.addEventListener('click', () => {
                const restoreContainer = document.getElementById('restore-grid-container');
                if (restoreContainer) restoreContainer.classList.toggle('hidden');
            });
        }

        selectType.addEventListener('change', populateCategories);

        const amountInput = document.getElementById('amount');
        if(amountInput) amountInput.addEventListener('input', () => this.triggerBudgetPrediction());

        populateCategories(); // Inicial

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = selectType.value;
            const amount = this.parseAmount(document.getElementById('amount').value);
            const date = document.getElementById('date').value;
            const isRecur = document.getElementById('is-recurring').checked;
            const noteInput = document.getElementById('transaction-note');
            const note = noteInput ? noteInput.value.trim() : '';
            
            if (!date) {
                return this.showToast('Por favor selecciona o ingresa una fecha.', 'warning');
            }
            
            const timestamp = Date.parse(date);
            if (isNaN(timestamp)) {
                return this.showToast('El formato de la fecha es inválido.', 'warning');
            }

            // Validación: No permitir fechas futuras
            const selectedDate = new Date(date + 'T00:00:00');
            const todayDate = new Date();
            todayDate.setHours(0,0,0,0);
            if (selectedDate > todayDate) {
                return this.showToast('No se permiten registros con fecha futura.', 'danger');
            }
            
            let category = selectCat.value;
            if(category === 'Otra') {
                category = customCat.value.trim();
                category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
                if(!category) return this.showToast('Escribe una categoría válida.', 'warning');
                DataService.addCategory(type, category);
            }

            if(isNaN(amount) || amount <= 0) return this.showToast('El monto debe ser > 0.', 'danger');

            const trx = { 
                id: this.editingId || crypto.randomUUID(), 
                type, amount, category, date, note
            };

            if (this.editingId) {
                DataService.updateTransaction(this.editingId, trx);
                this.showToast('Registro actualizado correctamente.', 'success');
                this.cancelEdit();
            } else {
                DataService.addTransaction(trx);
                if(isRecur) {
                    FinanceEngine.registerRecurringConfig(trx, date);
                    document.getElementById('is-recurring').checked = false;
                } else {
                    this.showToast('Operación creada correctamente.', 'success');
                }
            }

            App.syncDashboard();
            form.reset();
            populateCategories();
            if (document.getElementById('date')) {
                const localNow = new Date();
                document.getElementById('date').value = new Date(localNow.getTime() - (localNow.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            }
        });
    },

    bindPlanningForms() {
        // Formulario Presupuesto
        const bForm = document.getElementById('budget-form');
        const bCat = document.getElementById('budget-category');
        
        const fillBudgetSelect = () => {
             bCat.innerHTML = '';
             DataService.state.categories.gasto.forEach(c => bCat.add(new Option(c, c)));
        };
        fillBudgetSelect(); // Llamada síncrona, en prod ideal asíncrona o trigger

        bForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amt = this.parseAmount(document.getElementById('budget-amount').value);
            const period = document.getElementById('budget-period').value;
            if(isNaN(amt) || amt <= 0) {
                return this.showToast('El presupuesto debe ser un monto mayor a $0.', 'danger');
            }
            DataService.setBudget(bCat.value, amt, period);
            this.updateUI(); // Sincroniza y renderiza todo
            this.showToast('Presupuesto fijado exitosamente', 'success');
            bForm.reset();
        });

        // Formulario Meta
        const gForm = document.getElementById('goal-form');
        gForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('goal-name').value;
            const amt = this.parseAmount(document.getElementById('goal-amount').value);
            if(!name || name.trim() === '') {
                return this.showToast('Ingresa un nombre para la meta.', 'warning');
            }
            if(isNaN(amt) || amt <= 0) {
                return this.showToast('El monto de la meta debe ser mayor a $0.', 'danger');
            }
            DataService.addGoal(name.trim(), amt);
            this.updateUI(); // En lugar de renderPlanning para que actualice bloque A
            this.showToast('Meta de ahorro creada', 'success');
            gForm.reset();
        });

        // Formulario Simulador de Decisiones
        const simForm = document.getElementById('simulator-form');
        const simAction = document.getElementById('sim-action');
        const simTarget = document.getElementById('sim-target');
        const simResult = document.getElementById('sim-result');

        if (simAction) {
            simAction.addEventListener('change', () => {
                this.renderPlanning(DataService.state.transactions, FinanceEngine.state);
                if (simResult) simResult.classList.add('hidden');
            });
        }
        
        if (simTarget) {
            simTarget.addEventListener('change', () => {
                if (simResult) simResult.classList.add('hidden');
            });
        }

        if (simForm) {
            simForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const amountStr = document.getElementById('sim-amount').value;
                const amount = this.parseAmount(amountStr);
                const action = simAction.value;
                const target = simTarget.value;

                if (isNaN(amount) || amount <= 0) {
                    return this.showToast('Ingresa un monto válido para simular', 'warning');
                }
                if (!target || target === '') {
                    return this.showToast('Selecciona un objetivo válido', 'warning');
                }

                simResult.innerHTML = this.runIntelligentSimulation(action, target, amount);
                simResult.classList.remove('hidden');
            });
        }
    },

    runIntelligentSimulation(action, target, amount) {
        const rawTransactions = DataService.state.transactions;
        const state = FinanceEngine.state;
        const filteredData = FinanceEngine.getFilteredTransactions(rawTransactions, state);
        const metrics = FinanceEngine.calculateMetrics(filteredData);
        
        // 1. Validar datos suficientes (Evitar precisión falsa)
        if (metrics.income === 0 && metrics.expense === 0) {
            return `
                <div class="sim-result-card">
                    <div class="sim-empty-state">
                        <div class="sim-empty-icon">📊</div>
                        <p class="sim-insight-text">Aún no hay suficientes datos registrados en este periodo para estimar con precisión este escenario. Registra más movimientos o define metas/presupuestos para obtener simulaciones útiles.</p>
                    </div>
                </div>`;
        }

        // 2. Cálculos base de simulación
        let delta = 0;
        let changeLabel = 'Cambio neto';
        let isPositive = true;

        if (action === 'reducir_gasto') {
            delta = amount;
            changeLabel = 'Ahorro extra';
        } else if (action === 'aumentar_gasto') {
            delta = -amount;
            isPositive = false;
            changeLabel = 'Gasto adicional';
        } else if (action === 'aumentar_ingreso') {
            delta = amount;
            changeLabel = 'Ingreso extra';
        } else if (action === 'aumentar_aporte') {
            delta = 0; // El balance neto no cambia, solo la liquidez disponible
            changeLabel = 'Aporte a meta';
        }

        const currentSavingsRate = metrics.income > 0 ? (metrics.balance / metrics.income) * 100 : 0;
        const projectedBalance = metrics.balance + delta;
        const projectedSavingsRate = metrics.income > 0 ? (projectedBalance / metrics.income) * 100 : 0;
        const savingsRateDelta = projectedSavingsRate - currentSavingsRate;

        // Disponible proyectado (Lógica de liquidez)
        const totalAhorroReservado = DataService.state.goals.reduce((sum, g) => sum + (g.current || 0), 0);
        const globalMetrics = FinanceEngine.calculateMetrics(rawTransactions); 
        let disponibleActual = globalMetrics.balance - totalAhorroReservado;
        let disponibleProyectado = disponibleActual + delta;
        if (action === 'aumentar_aporte') disponibleProyectado -= amount;

        // Peso de la categoría seleccionada
        let categoryWeight = 0;
        if (action.includes('gasto')) {
            const catExpense = filteredData.filter(t => t.type === 'gasto' && t.category === target).reduce((sum, t) => sum + t.amount, 0);
            categoryWeight = metrics.expense > 0 ? (catExpense / metrics.expense) * 100 : 0;
        }

        // 3. Clasificación de Impacto Multi-factor
        let impactScore = 0;
        const incomeRatio = metrics.income > 0 ? amount / metrics.income : 0;
        
        if (incomeRatio > 0.15) impactScore += 4;
        else if (incomeRatio > 0.05) impactScore += 2;
        else if (incomeRatio > 0.01) impactScore += 1;

        if (categoryWeight > 20) impactScore += 2;
        if (Math.abs(savingsRateDelta) > 5) impactScore += 2;

        // Verificar impacto en presupuestos
        const budgetLimit = DataService.state.budgets[target];
        let budgetContext = '';
        if (budgetLimit && action.includes('gasto')) {
            const catExpense = filteredData.filter(t => t.type === 'gasto' && t.category === target).reduce((sum, t) => sum + t.amount, 0);
            const isExceeded = catExpense > budgetLimit;
            if (action === 'reducir_gasto' && isExceeded) {
                impactScore += 2;
                budgetContext = `Esta reducción te ayuda directamente a <strong>corregir el exceso de presupuesto</strong> en "${target}".`;
            } else if (action === 'aumentar_gasto' && (catExpense + amount > budgetLimit)) {
                impactScore += 2;
                budgetContext = isExceeded ? 
                    `Este gasto adicional <strong>profundiza el déficit</strong> en tu presupuesto de "${target}".` :
                    `Atención: Este movimiento te haría <strong>exceder el límite mensual</strong> de tu presupuesto en "${target}".`;
            }
        }

        let impactLabel = 'Marginal';
        let impactClass = 'sim-badge-marginal';
        if (impactScore >= 6) { impactLabel = 'Crítico'; impactClass = 'sim-badge-critico'; }
        else if (impactScore >= 4) { impactLabel = 'Relevante'; impactClass = 'sim-badge-relevante'; }
        else if (impactScore >= 2) { impactLabel = 'Moderado'; impactClass = 'sim-badge-moderado'; }

        // 4. Generación de Insights (Personalización profunda)
        let insight = '';
        if (action === 'reducir_gasto') {
            insight = `Optimizar el gasto en <strong>${target}</strong> incrementaría tu capacidad de ahorro del periodo. ${budgetContext} `;
            if (savingsRateDelta > 0) insight += `Tu tasa de ahorro subiría al <strong>${projectedSavingsRate.toFixed(1)}%</strong>.`;
        } else if (action === 'aumentar_ingreso') {
            insight = `Un ingreso extra de ${formatCOP.format(amount)} tiene un impacto <strong>${impactLabel.toLowerCase()}</strong> en tu estructura actual. `;
            insight += `Te permitiría alcanzar un disponible proyectado de <strong>${formatCOP.format(disponibleProyectado)}</strong>.`;
        } else if (action === 'aumentar_aporte') {
            const goal = DataService.state.goals.find(g => g.id === target);
            if (goal) {
                const newPerc = Math.min(100, (((goal.current || 0) + amount) / goal.target) * 100);
                insight = `Asignar este capital a <strong>${goal.title}</strong> aceleraría tu progreso hacia el <strong>${newPerc.toFixed(1)}%</strong> de cumplimiento. `;
                if (disponibleProyectado < 0) insight += `<br><span class="text-danger">⚠️ Nota: Este aporte excedería tu liquidez actual disponible.</span>`;
            }
        } else if (action === 'aumentar_gasto') {
            insight = `Este gasto adicional reduciría tu tasa de ahorro en un <strong>${Math.abs(savingsRateDelta).toFixed(1)}%</strong>. ${budgetContext}`;
        }

        return `
            <div class="sim-result-card">
                <div class="sim-header">
                    <div class="sim-title">🎯 Resultado de la Simulación</div>
                    <div class="sim-badge ${impactClass}">${impactLabel}</div>
                </div>
                <div class="sim-stats-grid">
                    <div class="sim-metric">
                        <span class="sim-metric-label">${changeLabel}</span>
                        <span class="sim-metric-value ${isPositive ? 'text-safe' : 'text-danger'}">
                            ${isPositive ? '+' : ''}${formatCOP.format(delta || amount)}
                        </span>
                    </div>
                    <div class="sim-metric">
                        <span class="sim-metric-label">Disponible Proyectado</span>
                        <span class="sim-metric-value">${formatCOP.format(disponibleProyectado)}</span>
                    </div>
                    <div class="sim-metric">
                        <span class="sim-metric-label">Tasa de Ahorro</span>
                        <span class="sim-metric-value">${projectedSavingsRate.toFixed(1)}%</span>
                        <span class="sim-metric-delta ${savingsRateDelta >= 0 ? 'text-safe' : 'text-danger'}">
                            ${savingsRateDelta >= 0 ? '↑' : '↓'} ${Math.abs(savingsRateDelta).toFixed(1)}%
                        </span>
                    </div>
                </div>
                <div class="sim-insight-box">
                    <div class="sim-insight-text">${insight}</div>
                </div>
            </div>`;
    },

    // 4. Sistema Central y Único de Rendereado Estricto (updateUI)
    updateUI() {
        const rawTransactions = DataService.state.transactions;
        const state = FinanceEngine.state;
        
        // Remover todos los skeleton loaders (Fase 3)
        document.querySelectorAll('.skeleton-box').forEach(el => {
            el.classList.remove('skeleton-box');
        });

        // --- Empty State Global (Fase 4) ---
        const emptyStateGlobal = document.getElementById('global-empty-state');
        const mainContent = document.getElementById('main-analysis-content');
        if (emptyStateGlobal && mainContent) {
            if (rawTransactions.length === 0) {
                emptyStateGlobal.classList.remove('hidden');
                mainContent.style.display = 'none';
                return; // No renderizar nada más
            } else {
                emptyStateGlobal.classList.add('hidden');
                mainContent.style.display = '';
            }
        }
        
        // 2 & 3. Separación Clásica: Extrayendo Información Derivada Pura
        const filteredData = FinanceEngine.getFilteredTransactions(rawTransactions, state);
        
        // Efectuando Cascadas hacia Módulos (Sincronización Total)
        this.updateMonthDisplay(state);
        this.updateAnalysisView(filteredData);
        this.renderHistory(filteredData);
        this.renderPlanning(rawTransactions, state);
    },

    updateMonthDisplay(state) {
        const container = document.getElementById('month-selector-container');
        const qContainer = document.getElementById('quincena-selector-container');
        
        if (state.filter === 'mes-especifico' || state.filter === 'quincena') {
            if(container) container.style.display = 'flex';
            if(qContainer) qContainer.style.display = state.filter === 'quincena' ? 'block' : 'none';
            
            const [y, m] = state.currentMonth.split('-');
            const d = new Date(y, parseInt(m)-1, 1);
            const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            const labelEl = document.getElementById('month-label');
            if(labelEl) labelEl.textContent = label.charAt(0).toUpperCase() + label.slice(1);
            const picker = document.getElementById('month-picker');
            if(picker) picker.value = state.currentMonth;
        } else if (state.filter === 'fecha-especifica' && state.specificDate) {
            // Mostrar la fecha seleccionada en el selector de mes (reutilizando UI)
            if(container) container.style.display = 'flex';
            if(qContainer) qContainer.style.display = 'none';
            const dateObj = new Date(state.specificDate + 'T00:00:00');
            const label = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const labelEl = document.getElementById('month-label');
            if(labelEl) labelEl.textContent = label.charAt(0).toUpperCase() + label.slice(1);
        } else {
            if(container) container.style.display = 'none';
            if(qContainer) qContainer.style.display = 'none';
        }
    },

    updateAnalysisView(filteredData) {
        const state = FinanceEngine.state;
        const rawTransactions = DataService.state.transactions;

        // Histórico
        const globalMetrics = FinanceEngine.calculateMetrics(rawTransactions);
        
        // Ahorro Reservado (Progreso actual, no targets totales)
        const ahorroReservado = DataService.state.goals.reduce((sum, g) => sum + (g.current || 0), 0);
        const dineroDisponible = globalMetrics.balance - ahorroReservado;
        
        document.getElementById('historical-balance').textContent = formatCOP.format(globalMetrics.balance);
        const elReserved = document.getElementById('reserved-savings');
        if(elReserved) elReserved.textContent = formatCOP.format(ahorroReservado);
        const elCash = document.getElementById('available-cash');
        if(elCash) elCash.textContent = formatCOP.format(dineroDisponible);

        const metrics = FinanceEngine.calculateMetrics(filteredData);
        const prevData = FinanceEngine.getPreviousPeriodTransactions(rawTransactions, state);
        const prevMetrics = FinanceEngine.calculateMetrics(prevData);
        const variations = Analytics.calculateVariations(metrics, prevMetrics);

        document.getElementById('total-balance').textContent = formatCOP.format(metrics.balance);
        document.getElementById('total-balance').className = 'amount small ' + (metrics.balance >= 0 ? 'positive' : 'negative');
        document.getElementById('total-income').textContent = formatCOP.format(metrics.income);
        document.getElementById('total-expense').textContent = formatCOP.format(metrics.expense);

        this.renderTrendBadge('balance', variations.balance, metrics.balance >= prevMetrics.balance);
        this.renderTrendBadge('income', variations.income, variations.income.absolute > 0 || (variations.income.absolute===0 && metrics.income>0));
        this.renderTrendBadge('expense', variations.expense, variations.expense.absolute <= 0); // para gasto menor es bueno

        const insights = Analytics.generateInsights(filteredData, metrics, prevMetrics);
        const container = document.getElementById('insights-container');
        const list = document.getElementById('insight-list');
        if(list) list.innerHTML = '';
        
        if (insights && insights.length > 0 && state.filter !== 'todo') {
            insights.forEach(ins => {
                const li = document.createElement('li');
                // Usar severity para la clase CSS en lugar del type genérico
                li.className = `insight-severity-${ins.severity || 'info'}`;
                li.innerHTML = `<span class="insight-icon-sm">${ins.icon}</span> <div class="insight-content">${ins.text}</div>`;
                list.appendChild(li);
            });
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }

        // Etiqueta dinámica de comparación según el filtro activo
        const comparisonLabel = this.getComparisonLabel(state);

        // Micro-Summaries (Reinforce Analytical Layer)
        const msBalance = document.getElementById('ms-balance');
        const msIncome = document.getElementById('ms-income');
        const msExpense = document.getElementById('ms-expense');

        if (msBalance) {
            const balLabel = variations.balance.percentage > 0 ? 'Mejora' : 'Caída';
            msBalance.innerHTML = state.filter === 'todo' ? 'Acumulado histórico (sin comparativa)' : `${balLabel} de <b>${Math.abs(variations.balance.percentage).toFixed(0)}%</b> ${comparisonLabel}`;
        }
        if (msIncome) {
            msIncome.innerHTML = state.filter === 'todo' ? 'Total histórico' : `<b>${formatCOP.format(metrics.income / (filteredData.length || 1))}</b> promedio por op.`;
        }
        if (msExpense) {
            const dailyAvg = metrics.expense / (state.filter === 'mes-especifico' ? new Date().getDate() : 7);
            msExpense.innerHTML = state.filter === 'todo' ? '' : `Gasto diario: <b>${formatCOP.format(dailyAvg)}</b>`;
        }

        this.renderCharts(filteredData);
    },

    // Genera la etiqueta de comparación dinámica en función del filtro activo
    getComparisonLabel(state) {
        if (state.filter === 'todo') return 'histórico sin comparativa';
        if (state.filter === 'fecha-especifica') return 'auditoría de fecha específica';
        if (state.filter === 'hoy') return 'vs ayer';
        if (state.filter === 'semana') return 'vs 7 días previos';
        if (state.filter === 'quincena') {
            return state.quincena === 1 ? 'vs quincena anterior' : 'vs 1ra quincena';
        }
        if (state.filter === 'mes-especifico') {
            const [y, m] = state.currentMonth.split('-');
            const prevDate = new Date(y, parseInt(m) - 2, 1);
            const prevName = prevDate.toLocaleDateString('es-ES', { month: 'long' });
            return `vs ${prevName.charAt(0).toUpperCase() + prevName.slice(1)}`;
        }
        return 'vs periodo anterior';
    },

    renderTrendBadge(baseId, variationObj, isGood) {
        const badgeEl = document.getElementById('trend-' + baseId);
        const deltaEl = document.getElementById('delta-' + baseId);
        if(!badgeEl) return;

        const comparisonLabel = this.getComparisonLabel(FinanceEngine.state);
        
        if (FinanceEngine.state.filter === 'todo' || FinanceEngine.state.filter === 'fecha-especifica' || isNaN(variationObj.percentage) || !isFinite(variationObj.percentage)) {
            badgeEl.className = 'trend-badge trend-neutral';
            badgeEl.textContent = '--%';
            if(deltaEl) deltaEl.textContent = FinanceEngine.state.filter === 'fecha-especifica' ? 'Auditoría puntual' : 'Acumulado histórico';
            return;
        }
        
        badgeEl.className = 'trend-badge ' + (variationObj.percentage === 0 ? 'trend-neutral' : isGood ? 'trend-good' : 'trend-bad');
        const sign = variationObj.percentage > 0 ? '↑' : variationObj.percentage < 0 ? '↓' : '';
        badgeEl.textContent = `${sign} ${Math.abs(variationObj.percentage).toFixed(1)}%`;
        
        if(deltaEl) {
            const absSign = variationObj.absolute > 0 ? '+' : '';
            deltaEl.textContent = `${absSign}${formatCOP.format(variationObj.absolute)} ${comparisonLabel}`;
        }
    },

    openPeriodSummary() {
        const rawT = DataService.state.transactions;
        const state = FinanceEngine.state;
        const filteredData = FinanceEngine.getFilteredTransactions(rawT, state);
        const metrics = FinanceEngine.calculateMetrics(filteredData);
        
        let days = 1;
        if (state.filter === 'semana') days = 7;
        else if (state.filter === 'mes-especifico') {
            const [y, m] = state.currentMonth.split('-');
            days = new Date(y, m, 0).getDate();
        } else if (state.filter === 'todo') {
            if (filteredData.length > 0) {
                const ts = filteredData.map(t => new Date(t.date).getTime());
                const min = Math.min(...ts); const max = Math.max(...ts);
                days = Math.max(1, Math.ceil((max - min) / (1000 * 60 * 60 * 24)));
            }
        }

        // --- Health Score Badge ---
        const healthBadgeEl = document.getElementById('summary-health-badge');
        if (healthBadgeEl) {
            if (metrics.income > 0) {
                const savingRate = (metrics.balance / metrics.income) * 100;
                let badgeClass, badgeEmoji, badgeText, badgeDesc;
                if (savingRate >= 20) {
                    badgeClass = 'health-badge-good';
                    badgeEmoji = '🟢';
                    badgeText = 'Saludable';
                    badgeDesc = `Tasa de ahorro del ${savingRate.toFixed(0)}%. Excelente gestión financiera.`;
                } else if (savingRate > 0) {
                    badgeClass = 'health-badge-warning';
                    badgeEmoji = '🟡';
                    badgeText = 'En observación';
                    badgeDesc = `Tasa de ahorro del ${savingRate.toFixed(0)}%. Margen estrecho, busca reducir gastos.`;
                } else {
                    badgeClass = 'health-badge-deficit';
                    badgeEmoji = '🔴';
                    badgeText = 'Déficit';
                    badgeDesc = `Tus gastos superan tus ingresos. Revisa categorías críticas.`;
                }
                healthBadgeEl.innerHTML = `
                    <div class="health-badge ${badgeClass}">
                        <span class="health-badge-emoji">${badgeEmoji}</span>
                        <div class="health-badge-info">
                            <span class="health-badge-label">${badgeText}</span>
                            <span class="health-badge-desc">${badgeDesc}</span>
                        </div>
                    </div>`;
                healthBadgeEl.classList.remove('hidden');
            } else {
                healthBadgeEl.innerHTML = `
                    <div class="health-badge health-badge-neutral">
                        <span class="health-badge-emoji">ℹ️</span>
                        <div class="health-badge-info">
                            <span class="health-badge-label">Sin ingresos</span>
                            <span class="health-badge-desc">Registra ingresos para obtener tu evaluación financiera.</span>
                        </div>
                    </div>`;
                healthBadgeEl.classList.remove('hidden');
            }
        }
        
        document.getElementById('summary-net').textContent = formatCOP.format(metrics.balance);
        document.getElementById('summary-net').style.color = metrics.balance >= 0 ? "var(--income-color)" : "var(--expense-color)";
        document.getElementById('summary-daily').textContent = formatCOP.format(metrics.expense / days);
        
        const topCatsEl = document.getElementById('summary-top-cats');
        topCatsEl.innerHTML = '';
        const expenses = filteredData.filter(x => x.type === 'gasto');
        const catMap = expenses.reduce((a, b) => { a[b.category] = (a[b.category]||0) + b.amount; return a; }, {});
        const sorted = Object.entries(catMap).sort((a,b) => b[1] - a[1]);
        
        if (sorted.length === 0) topCatsEl.innerHTML = `<span style="font-size:0.8rem; color:var(--text-secondary);">No hay gastos registrados.</span>`;
        
        sorted.slice(0, 5).forEach(c => {
            const row = `<div class="cat-row"><span>${c[0]}</span> <span>${formatCOP.format(c[1])}</span></div>`;
            topCatsEl.innerHTML += row;
        });

        document.getElementById('period-summary-modal').classList.remove('hidden');
    },

    renderHistory(filteredData) {
        const tbody = document.getElementById('transaction-list');
        tbody.innerHTML = '';

        const sorted = [...filteredData].sort((a,b) => new Date(b.date) - new Date(a.date));
        
        if (sorted.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-text">No hay movimientos registrados para este periodo. Prueba cambiando el filtro.</div>
                </div>
            </td></tr>`;
            return;
        }

        sorted.forEach(t => {
            const tr = document.createElement('tr');
            const inc = t.type === 'ingreso';
            const dStr = new Date(t.date+'T00:00:00').toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit' });
            
            tr.innerHTML = `
                <td><span class="text-secondary-sm">${dStr}</span></td>
                <td>
                    <div class="transaction-cat">${t.category}</div>
                    ${t.note ? `<div class="transaction-note">${t.note}</div>` : ''}
                    <span class="transaction-type ${inc ? 'type-income' : 'type-expense'}">${inc ? 'Ingreso' : 'Gasto'}</span>
                </td>
                <td class="text-right ${inc ? 'positive' : 'negative'}">
                    ${inc ? '+' : '-'} ${formatCOP.format(t.amount)}
                </td>
                <td class="text-right">
                    <div class="transaction-actions">
                        <button class="btn-edit" data-id="${t.id}" title="Editar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-delete" data-id="${t.id}" title="Eliminar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    startEdit(id) {
        const trx = DataService.state.transactions.find(t => t.id === id);
        if (!trx) return;

        this.editingId = id;
        
        // Poblar formulario
        document.getElementById('type').value = trx.type;
        document.getElementById('amount').value = new Intl.NumberFormat('es-CO').format(trx.amount);
        document.getElementById('date').value = trx.date;
        document.getElementById('is-recurring').checked = false; // Reset recurrente por seguridad en edición

        // Disparar cambio de tipo para categorías
        document.getElementById('type').dispatchEvent(new Event('change'));
        
        const selectCat = document.getElementById('category');
        const customCat = document.getElementById('custom-category');
        
        // Buscar si es categoría estándar o custom
        const options = Array.from(selectCat.options).map(o => o.value);
        if (options.includes(trx.category)) {
            selectCat.value = trx.category;
            customCat.classList.add('hidden');
        } else {
            selectCat.value = 'Otra';
            customCat.value = trx.category;
            customCat.classList.remove('hidden');
        }

        // Cambiar UI
        document.getElementById('btn-save-transaction').textContent = 'Guardar Cambios';
        document.getElementById('btn-cancel-edit').classList.remove('hidden');

        // Navegar a la tab de registro
        document.querySelector('[data-tab="tab-registro"]').click();
        
        this.showToast('Editando registro...', 'warning');
    },

    cancelEdit() {
        this.editingId = null;
        const form = document.getElementById('transaction-form');
        form.reset();
        
        // Reset Categorías
        document.getElementById('type').dispatchEvent(new Event('change'));
        
        document.getElementById('btn-save-transaction').textContent = 'Registrar Movimiento';
        document.getElementById('btn-cancel-edit').classList.add('hidden');
    },

    setLoading(btnId, state) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (state) {
            btn.classList.add('btn-loading');
            btn.disabled = true;
        } else {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    },

    promptDelete(id) {
        this.transactionToDelete = id;
        document.getElementById('delete-modal').classList.remove('hidden');
    },

    promptGoalDelete(id) {
        const goal = DataService.state.goals.find(g => g.id === id);
        if (!goal) return;
        if (confirm(`¿Estás seguro de que deseas eliminar la meta "${goal.title}"?`)) {
            DataService.deleteGoal(id);
            this.updateUI();
            this.showToast('Meta eliminada correctamente', 'success');
        }
    },

    promptGoalEdit(id) {
        const goal = DataService.state.goals.find(g => g.id === id);
        if (!goal) return;
        
        const newTitle = prompt("Nuevo nombre de la meta:", goal.title);
        if (newTitle === null) return; // Cancelado
        
        const formattedTarget = new Intl.NumberFormat('es-CO').format(goal.target);
        const newTarget = prompt("Nuevo monto objetivo:", formattedTarget);
        if (newTarget === null) return; // Cancelado
        
        const targetNum = this.parseAmount(newTarget);
        if (isNaN(targetNum) || targetNum <= 0) {
            this.showToast('Monto inválido', 'danger');
            return;
        }

        DataService.updateGoal(id, newTitle.trim() || goal.title, targetNum);
        this.updateUI();
        this.showToast('Meta actualizada', 'success');
    },

    promptGoalContribute(id) {
        const goal = DataService.state.goals.find(g => g.id === id);
        if (!goal) return;

        const amountStr = prompt(`¿Cuánto deseas aportar a "${goal.title}"?`);
        if (amountStr === null) return;

        const amount = this.parseAmount(amountStr);
        if (isNaN(amount) || amount <= 0) {
            this.showToast('Monto inválido', 'danger');
            return;
        }

        // Verificar si hay suficiente dinero disponible para reservar
        const rawTransactions = DataService.state.transactions;
        const globalMetrics = FinanceEngine.calculateMetrics(rawTransactions);
        const ahorroReservado = DataService.state.goals.reduce((sum, g) => sum + (g.current || 0), 0);
        const dineroDisponible = globalMetrics.balance - ahorroReservado;

        if (amount > dineroDisponible) {
            this.showToast('No tienes suficiente dinero disponible para este aporte.', 'warning');
            return;
        }

        const note = prompt("Nota del aporte (opcional):", "Aporte manual");
        if (note === null) return;

        DataService.contributeToGoal(id, amount, note.trim() || 'Aporte manual');
        this.updateUI();
        this.showToast(`¡Aporte de ${formatCOP.format(amount)} realizado!`, 'success');
    },

    showGoalHistory(id) {
        const goal = DataService.state.goals.find(g => g.id === id);
        if (!goal) return;

        const modal = document.getElementById('goal-history-modal');
        const list = document.getElementById('goal-history-list');
        const title = document.getElementById('goal-history-title');
        const subtitle = document.getElementById('goal-history-subtitle');

        if (!modal || !list) return;

        title.textContent = goal.title;
        subtitle.textContent = `Meta Total: ${formatCOP.format(goal.target)}`;
        list.innerHTML = '';

        if (!goal.logs || goal.logs.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:2rem; opacity:0.6;">
                <div style="font-size:2rem; margin-bottom:1rem;">🕯️</div>
                <p>No hay registros de aportes todavía.</p>
            </div>`;
        } else {
            const sorted = [...goal.logs].sort((a,b) => new Date(b.date) - new Date(a.date));
            sorted.reverse().forEach(log => {
                const item = document.createElement('div');
                item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:0.8rem; border-bottom:1px solid rgba(255,255,255,0.05);';
                item.innerHTML = `
                    <div>
                        <div style="font-weight:500; font-size:0.9rem;">${log.note}</div>
                        <div style="font-size:0.7rem; color:var(--text-secondary);">${new Date(log.date + 'T00:00:00').toLocaleDateString('es-ES', {day:'numeric', month:'long', year:'numeric'})}</div>
                    </div>
                    <div style="font-weight:700; color:var(--income-color);">+ ${formatCOP.format(log.amount)}</div>
                `;
                list.appendChild(item);
            });
        }

        modal.classList.remove('hidden');
    },

    promptBudgetDelete(category) {
        if (confirm(`¿Estás seguro de que deseas eliminar el presupuesto para "${category}"?`)) {
            DataService.deleteBudget(category);
            this.updateUI();
            this.showToast('Presupuesto eliminado', 'success');
        }
    },

    promptBudgetEdit(category) {
        const currentLimit = DataService.state.budgets[category];
        const formattedLimit = new Intl.NumberFormat('es-CO').format(currentLimit);
        const newLimitStr = prompt(`Nuevo límite mensual para "${category}":`, formattedLimit);
        
        if (newLimitStr === null) return;
        
        const newLimit = this.parseAmount(newLimitStr);
        if (isNaN(newLimit) || newLimit <= 0) {
            this.showToast('Monto inválido', 'danger');
            return;
        }

        DataService.setBudget(category, newLimit);
        this.updateUI();
        this.showToast('Presupuesto actualizado', 'success');
    },

    renderPlanning(rawTransactions, state) {
        const statuses = Analytics.getBudgetStatuses(rawTransactions, state);
        
        // --- 1. ESTADO GENERAL DE PLANIFICACIÓN (BLOQUE A) ---
        let safeCount = 0, riskCount = 0;
        statuses.forEach(b => {
            if (b.status === 'excedido' || b.status === 'riesgo') riskCount++;
            else safeCount++;
        });
        
        const activeGoalsCount = DataService.state.goals.length;
        
        // Capacidad de Ahorro Estimada (Ingresos - Gastos - Metas)
        const metrics = FinanceEngine.calculateMetrics(rawTransactions);
        const ahorroReservado = DataService.state.goals.reduce((sum, g) => sum + (g.current || 0), 0);
        let savingCapacity = metrics.balance - ahorroReservado;
        if (savingCapacity < 0) savingCapacity = 0;

        const statSafe = document.getElementById('stat-budgets-safe');
        const statRisk = document.getElementById('stat-budgets-risk');
        const statGoals = document.getElementById('stat-goals-active');
        const statCapacity = document.getElementById('stat-saving-capacity');

        if (statSafe) statSafe.textContent = safeCount;
        if (statRisk) {
            statRisk.textContent = riskCount;
            if (riskCount > 0) statRisk.className = 'stat-value text-danger';
            else statRisk.className = 'stat-value text-safe';
        }
        if (statGoals) statGoals.textContent = activeGoalsCount;
        if (statCapacity) statCapacity.textContent = formatCOP.format(savingCapacity);

        // --- 1.5 PANEL DE RECOMENDACIONES ---
        const recommendationsPane = document.getElementById('planning-recommendations');
        const insightsList = document.getElementById('planning-insights-list');
        const pInsights = Analytics.generatePlanningInsights(statuses, savingCapacity);
        
        if (pInsights.length > 0 && recommendationsPane && insightsList) {
            insightsList.innerHTML = '';
            pInsights.forEach(i => {
                const li = document.createElement('li');
                li.className = `planning-insight insight-border-${i.type || 'info'}`;
                li.innerHTML = `<span class="insight-icon-sm">${i.icon}</span><span class="insight-text-sm">${i.text}</span>`;
                insightsList.appendChild(li);
            });
            recommendationsPane.style.display = 'block';
        } else if (recommendationsPane) {
            recommendationsPane.style.display = 'none';
        }

        // --- 2. PRESUPUESTOS (BLOQUE B) ---
        const list = document.getElementById('budgets-list');
        list.innerHTML = '';
        
        if(statuses.length === 0) {
            list.innerHTML = `<div class="empty-state">🎯 <p>Define un presupuesto para controlar tus categorías.</p></div>`;
        } else {
            statuses.forEach(b => {
                let colorClass = b.status === 'excedido' ? 'fill-danger' : b.status === 'riesgo' ? 'fill-warning' : 'fill-safe';
                let stateText = b.status === 'excedido' ? '<span class="text-danger" style="font-size:0.7rem; font-weight:600;">Excedido</span>' : 
                                b.status === 'riesgo' ? '<span class="text-warning" style="font-size:0.7rem; font-weight:600;">En Riesgo</span>' : 
                                '<span class="text-safe" style="font-size:0.7rem; font-weight:600;">En Control</span>';
                
                if(b.status === 'excedido') this.showToast(`Has excedido el prespuesto en ${b.category}`, 'danger');
                
                const wrapper = document.createElement('div');
                wrapper.className = 'progress-wrapper';
                wrapper.innerHTML = `
                    <div class="progress-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 700; display:flex; align-items:center; gap:0.4rem;">
                                ${b.category}
                                <span style="font-size: 0.6rem; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; text-transform: uppercase; font-weight:400; letter-spacing:0.5px;">
                                    ${b.period}${b.quincena ? ' Q'+b.quincena : ''}
                                </span>
                            </span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); margin-top:2px;">${formatCOP.format(b.spent)} / ${formatCOP.format(b.limit)}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <div class="budget-actions" style="display: flex; gap: 0.4rem; margin-bottom: 0.3rem;">
                                <button class="btn-budget-edit" data-cat="${b.category}" title="Editar Límite">✏️</button>
                                <button class="btn-budget-delete" data-cat="${b.category}" title="Eliminar Presupuesto">❌</button>
                            </div>
                            ${stateText}
                        </div>
                    </div>
                    <div class="progress-bar-bg"><div class="progress-fill ${colorClass}" style="width: ${Math.min(b.percentage, 100)}%;"></div></div>
                `;
                list.appendChild(wrapper);
            });
        }

        // --- 3. METAS VISUALES (BLOQUE C) ---
        const gList = document.getElementById('goals-list');
        gList.innerHTML = '';
        if(DataService.state.goals.length === 0) {
            gList.innerHTML = `<div class="empty-state">💰 <p>Establece objetivos de ahorro.</p></div>`;
        } else {
            DataService.state.goals.forEach(g => {
                const currentSaved = g.current || 0;
                const perc = g.target > 0 ? (currentSaved / g.target)*100 : 0;
                let colorClass = perc >= 100 ? 'fill-safe' : 'fill-warning';
                
                let stateText = perc >= 100 ? '<span class="text-safe" style="font-size:0.7rem; font-weight:600;">Cumplida 🌟</span>' : 
                                perc > 0 ? '<span class="text-primary" style="font-size:0.7rem; font-weight:600;">En Progreso</span>' : 
                                '<span class="text-secondary" style="font-size:0.7rem; font-weight:600;">Sin Iniciar</span>';

                // Aporte Sugerido (Inteligencia Funcional Etapa 2)
                const faltante = g.target - currentSaved;
                let sugText = '';
                if (faltante > 0) {
                    if (savingCapacity > 0) {
                       const suggested = Math.min(faltante, savingCapacity);
                       sugText = `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top: 0.8rem; padding-top: 0.6rem; border-top: 1px solid rgba(255,255,255,0.05);">💡 Aporte sostenible estimado: <strong class="text-safe">+ ${formatCOP.format(suggested)}</strong></div>`;
                    } else {
                       sugText = `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top: 0.8rem; padding-top: 0.6rem; border-top: 1px solid rgba(255,255,255,0.05);"><span style="color:var(--warning-color)">⚠️</span> No hay liquidez sobrante para aportar hoy.</div>`;
                    }
                } else {
                    sugText = `<div style="font-size:0.75rem; color:var(--income-color); margin-top: 0.8rem; padding-top: 0.6rem; border-top: 1px solid rgba(255,255,255,0.05); font-weight:600;">¡Has alcanzado tu objetivo!</div>`;
                }

                // Proyección de Cumplimiento (ETA) - Fase 3 Planeación Avanzada
                let etaText = '';
                if (perc > 0 && perc < 100 && g.logs && g.logs.length > 0) {
                    const sortedLogs = [...g.logs].sort((a,b) => new Date(a.date) - new Date(b.date));
                    const firstDate = new Date(sortedLogs[0].date);
                    const lastDate = new Date(); 
                    const daysDiff = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
                    const avgPerDay = currentSaved / daysDiff;
                    
                    if (avgPerDay > 0) {
                        const daysLeft = Math.ceil(faltante / avgPerDay);
                        if (daysLeft < 3650) { 
                            let timeMsg = daysLeft > 30 ? `~${Math.round(daysLeft/30)} meses` : `~${daysLeft} días`;
                            etaText = `<div style="font-size:0.7rem; color:var(--text-secondary); margin-top: 0.3rem;">⏳ A este ritmo, llegarás en <strong>${timeMsg}</strong>.</div>`;
                        }
                    }
                }

                const card = document.createElement('div');
                card.className = 'goal-card';
                card.innerHTML = `
                    <div class="goal-card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <div class="goal-title">${g.title}</div>
                        <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <div class="goal-actions" style="display: flex; gap: 0.4rem; margin-bottom: 0.3rem;">
                                <button class="btn-goal-history" data-id="${g.id}" title="Ver Historial">📜</button>
                                <button class="btn-goal-contribute" data-id="${g.id}" title="Aportar Dinero">💰</button>
                                <button class="btn-goal-edit" data-id="${g.id}" title="Editar Meta">✏️</button>
                                <button class="btn-goal-delete" data-id="${g.id}" title="Eliminar Meta">❌</button>
                            </div>
                            ${stateText}
                        </div>
                    </div>
                    <div class="goal-stats"><span>${formatCOP.format(currentSaved)} ahorrado</span> <span>Meta: ${formatCOP.format(g.target)}</span></div>
                    <div class="progress-bar-bg"><div class="progress-fill ${colorClass}" style="width: ${Math.min(perc, 100)}%;"></div></div>
                    ${etaText}
                    ${sugText}
                `;
                gList.appendChild(card);
            });
        }

        // Listeners delegados o directos para la planificación
        list.querySelectorAll('.btn-budget-edit').forEach(b => b.onclick = (e) => this.promptBudgetEdit(e.currentTarget.dataset.cat));
        list.querySelectorAll('.btn-budget-delete').forEach(b => b.onclick = (e) => this.promptBudgetDelete(e.currentTarget.dataset.cat));
        gList.querySelectorAll('.btn-goal-contribute').forEach(b => b.onclick = (e) => this.promptGoalContribute(e.currentTarget.dataset.id));
        gList.querySelectorAll('.btn-goal-edit').forEach(b => b.onclick = (e) => this.promptGoalEdit(e.currentTarget.dataset.id));
        gList.querySelectorAll('.btn-goal-delete').forEach(b => b.onclick = (e) => this.promptGoalDelete(e.currentTarget.dataset.id));
        gList.querySelectorAll('.btn-goal-history').forEach(b => b.onclick = (e) => this.showGoalHistory(e.currentTarget.dataset.id));

        // --- 4. ACTUALIZAR SIMULADOR DE ESCENARIOS (BLOQUE D) ---
        const simAction = document.getElementById('sim-action');
        const simTarget = document.getElementById('sim-target');
        const simLabel = document.getElementById('sim-target-label');

        if (simAction && simTarget) {
            const action = simAction.value;
            simTarget.innerHTML = '';
            
            if (action.includes('gasto')) {
                simLabel.textContent = 'la categoría';
                const expenseCats = [...new Set(rawTransactions.filter(t => t.type === 'gasto').map(t => t.category))];
                expenseCats.forEach(c => simTarget.add(new Option(c, c)));
                if (expenseCats.length === 0) simTarget.add(new Option('(Sin categorías)', ''));
            } else if (action === 'aumentar_ingreso') {
                simLabel.textContent = 'la fuente';
                const incomeCats = [...new Set(rawTransactions.filter(t => t.type === 'ingreso').map(t => t.category))];
                incomeCats.forEach(c => simTarget.add(new Option(c, c)));
                if (incomeCats.length === 0) simTarget.add(new Option('(Sin categorías)', ''));
            } else if (action === 'aumentar_aporte') {
                simLabel.textContent = 'la meta';
                let hasActive = false;
                DataService.state.goals.forEach(g => {
                    if ((g.current || 0) < g.target) {
                        simTarget.add(new Option(g.title, g.id));
                        hasActive = true;
                    }
                });
                if (!hasActive) simTarget.add(new Option('(Sin metas activas)', ''));
            }
        }
    },

    renderRecurringReminders() {
        const container = document.getElementById('recurring-reminders-container');
        const list = document.getElementById('recurring-reminders-list');
        if(!container || !list) return;

        const pending = FinanceEngine.state.pendingRecurring || [];
        
        if (pending.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        list.innerHTML = '';
        
        pending.forEach(rec => {
            const div = document.createElement('div');
            div.className = 'glass';
            div.style.cssText = 'padding: 0.8rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05);';
            const badge = rec.missedCount > 1 ? `<span style="background:var(--expense-color); color: white; padding: 0.15rem 0.4rem; border-radius:10px; font-size:0.65rem; margin-left:0.5rem; white-space: nowrap;">${rec.missedCount} meses pendientes</span>` : '';
            div.innerHTML = `
                <div>
                    <span style="font-weight: 500; font-size: 0.9rem; display: flex; align-items: center;">${this.getIconForCategory(rec.category)} ${rec.category} ${badge}</span>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">${formatCOP.format(rec.amount * rec.missedCount)} total</div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary small btn-accept-rec" data-id="${rec.id}">Registrar</button>
                    <button class="btn-outline small btn-skip-rec" data-id="${rec.id}">Omitir</button>
                </div>
            `;
            list.appendChild(div);
        });

        // Add Listeners
        list.querySelectorAll('.btn-accept-rec').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.handleRecurringAction(id, 'accept');
            });
        });
        list.querySelectorAll('.btn-skip-rec').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.handleRecurringAction(id, 'skip');
            });
        });
    },

    handleRecurringAction(id, action) {
        const pending = FinanceEngine.state.pendingRecurring || [];
        const index = pending.findIndex(r => r.id === id);
        if (index === -1) return;
        
        const rec = pending[index];
        // Encontrar original en DataService
        const origRec = DataService.state.recurring.find(r => r.id === id);

        if (action === 'accept') {
            for(let i=0; i<rec.missedCount; i++) {
                const newT = {
                    id: 'REC_' + crypto.randomUUID(),
                    type: rec.type,
                    amount: rec.amount,
                    category: rec.category,
                    date: `${rec.targetMonth}-${String(rec.day).padStart(2,'0')}`,
                    note: `Gasto recurrente automatizado`
                };
                DataService.state.transactions.push(newT);
            }
            this.showToast(`Registrado: ${rec.category} (${rec.missedCount} mes(es))`, 'success');
        } else {
            this.showToast(`Omitido por ahora: ${rec.category}`, 'warning');
        }

        if (origRec) {
            origRec.lastRunMonth = rec.targetMonth;
            DataService.saveAll();
        }

        FinanceEngine.state.pendingRecurring.splice(index, 1);
        App.syncDashboard();
    },

    renderCharts(filteredData) {
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.font.weight = '500';

        // 1er Grafico (Distribución)
        const ctxP = document.getElementById('categoryChart').getContext('2d');
        if(this.charCat) this.charCat.destroy();

        const expenses = filteredData.filter(x => x.type === 'gasto');
        const maps = expenses.reduce((a, b) => { a[b.category] = (a[b.category]||0) + b.amount; return a; }, {});
        const labels = Object.keys(maps);
        const data = Object.values(maps);
        const backgroundColors = labels.map(l => DataService.state.categoryColors[l] || '#64748b');

        if(labels.length === 0) {
            this.charCat = new Chart(ctxP, { type:'doughnut', data: {labels:['Sin Datos'], datasets:[{data:[1], backgroundColor:['rgba(255,255,255,0.05)']}]}, options:{maintainAspectRatio:false, cutout:'80%', plugins:{title:{display:true, text:'Esperando datos de gastos...', color:'#94a3b8', font:{size:12, weight:'400'}}, legend:{display:false}, tooltip:{enabled:false}}} });
        } else {
            this.charCat = new Chart(ctxP, {
                type:'doughnut',
                data: { labels, datasets:[{ data, backgroundColor: backgroundColors, borderWidth: 0}] },
                options:{ 
                    maintainAspectRatio:false, cutout:'75%', 
                    onClick: (evt, activeElements) => {
                        if (activeElements.length > 0) {
                            const index = activeElements[0].index;
                            const categoryLabel = this.charCat.data.labels[index];
                            
                            // Drill-down: Redirigir a operaciones y filtrar visualmente la tabla
                            document.querySelector('[data-tab="tab-registro"]').click();
                            this.showToast(`Historial filtrado por: ${categoryLabel}`, 'success');
                            
                            setTimeout(() => {
                                const rows = document.querySelectorAll('#transaction-list tr');
                                rows.forEach(r => {
                                    if (r.textContent.includes(categoryLabel)) r.style.display = '';
                                    else if (!r.textContent.includes('No hay datos')) r.style.display = 'none';
                                });
                            }, 100);
                        }
                    },
                    plugins: { title:{display:true, text:'Distribución de Gastos', color:'#f8fafc', font:{size:14, weight:'600'}}, tooltip: { callbacks:{ label: c => ` ${formatCOP.format(c.raw)}` } }, legend:{position:'right', labels:{color:'#94a3b8', usePointStyle:true, padding:15}}} }
            });
        }

        // 2do Grafico (Flujo - Comportamiento Temporal)
        const ctxB = document.getElementById('dateChart').getContext('2d');
        if(this.charDate) this.charDate.destroy();

        let uniqueDates = [...new Set(filteredData.map(t => t.date))].sort().slice(-7);
        // Si no hay datos, poblar por defecto con 7 últimas para mantener estética limpia
        if (uniqueDates.length === 0) {
            const todayFallback = new Date(); 
            todayFallback.setHours(0,0,0,0);
            for(let i=6; i>=0; i--) { 
                const d = new Date(todayFallback); 
                d.setDate(d.getDate()-i); 
                uniqueDates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`); 
            }
        }
        
        const incD = uniqueDates.map(dt => filteredData.filter(t => t.date === dt && t.type === 'ingreso').reduce((a,b)=>a+b.amount,0));
        const expD = uniqueDates.map(dt => filteredData.filter(t => t.date === dt && t.type === 'gasto').reduce((a,b)=>a+b.amount,0));

        this.charDate = new Chart(ctxB, {
            type: 'bar',
            data: {
                labels: uniqueDates.map(d=>d.substring(5)), // MM-DD
                datasets: [
                    { label: 'Ingresos', data: incD, backgroundColor: '#10b981', borderRadius:4 },
                    { label: 'Gastos', data: expD, backgroundColor: '#ef4444', borderRadius:4 }
                ]
            },
            options: {
                maintainAspectRatio:false, interaction:{mode:'index'}, 
                scales: { 
                    y:{ border:{display:false}, grid:{color:'rgba(255,255,255,0.05)'}, ticks:{callback: v => v>=1000?`$${v/1000}k`:`$${v}`, font:{size:10}} },
                    x:{ grid:{display:false}, ticks:{font:{size:10}} }
                },
                plugins: { title:{display:true, text:'Flujo de Caja Diario', color:'#f8fafc', font:{size:14, weight:'600'}}, legend:{display:false}, tooltip:{callbacks:{label:c=>` ${formatCOP.format(c.raw)}`}} }
            }
        });

        // 3er Grafico: Comparación Total Ingresos vs Gastos (incomeExpenseChart)
        const ctxIE = document.getElementById('incomeExpenseChart');
        if(ctxIE) {
            if(this.charIncExp) this.charIncExp.destroy();
            const metrics = FinanceEngine.calculateMetrics(filteredData);
            const ieContainer = ctxIE.parentElement;
            
            // Limpiar empty state previo si existe
            const prevEmpty = ieContainer.querySelector('.chart-empty-state');
            if (prevEmpty) prevEmpty.remove();
            ctxIE.style.display = '';

            // Manejo de extremos: si no hay ingresos Y no hay gastos, o si falta uno
            if (metrics.income === 0 && metrics.expense === 0) {
                ctxIE.style.display = 'none';
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'chart-empty-state';
                emptyDiv.innerHTML = `<div class="empty-state" style="margin:0; padding:2rem;"><div class="empty-state-icon">📭</div><div class="empty-state-text">Sin actividad registrada en este periodo para comparar.</div></div>`;
                ieContainer.appendChild(emptyDiv);
                this.charIncExp = null;
            } else if (metrics.income === 0) {
                ctxIE.style.display = 'none';
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'chart-empty-state';
                emptyDiv.innerHTML = `<div class="chart-info-card"><span class="chart-info-icon">📉</span><span>No hay <strong>ingresos</strong> registrados en este periodo.</span><span class="chart-info-detail">Gastos totales: <strong>${formatCOP.format(metrics.expense)}</strong></span></div>`;
                ieContainer.appendChild(emptyDiv);
                this.charIncExp = null;
            } else if (metrics.expense === 0) {
                ctxIE.style.display = 'none';
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'chart-empty-state';
                emptyDiv.innerHTML = `<div class="chart-info-card"><span class="chart-info-icon">📈</span><span>No hay <strong>gastos</strong> registrados en este periodo.</span><span class="chart-info-detail">Ingresos totales: <strong>${formatCOP.format(metrics.income)}</strong></span></div>`;
                ieContainer.appendChild(emptyDiv);
                this.charIncExp = null;
            } else {
                this.charIncExp = new Chart(ctxIE.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['Ingresos vs Gastos'],
                        datasets: [
                            { label: 'Ingresos', data: [metrics.income], backgroundColor: '#10b981', borderRadius: 6 },
                            { label: 'Gastos', data: [metrics.expense], backgroundColor: '#ef4444', borderRadius: 6 }
                        ]
                    },
                    options: {
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        scales: { 
                            x: { display: false },
                            y: { border: {display: false}, grid: {display: false} }
                        },
                        plugins: { 
                            title:{display:true, text:'Comparación Ingresos vs Gastos', color:'#f8fafc', font:{size:14, weight:'600'}},
                            legend: { position: 'bottom', labels: {color: '#94a3b8', usePointStyle: true, boxWidth: 8} }, 
                            tooltip: { callbacks: { label: c => ` ${formatCOP.format(c.raw)}` } } 
                        }
                    }
                });
            }
        }

        // 4to Grafico: Tendencia del Balance (balanceTrendChart) - MEJORADO PHASE 3
        const ctxTrend = document.getElementById('balanceTrendChart');
        if(ctxTrend) {
            if(this.charBalTrend) this.charBalTrend.destroy();
            
            const state = FinanceEngine.state;
            let labels = [];
            
            // Generar todos los días del periodo
            if (state.filter === 'mes-especifico') {
                const [y, m] = state.currentMonth.split('-');
                const lastDay = new Date(y, m, 0).getDate();
                for (let i = 1; i <= lastDay; i++) {
                    labels.push(`${state.currentMonth}-${String(i).padStart(2, '0')}`);
                }
            } else if (state.filter === 'semana') {
                const today = new Date();
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(today); d.setDate(today.getDate() - i);
                    labels.push(d.toISOString().split('T')[0]);
                }
            } else {
                labels = [...new Set(filteredData.map(t => t.date))].sort();
            }

            if (labels.length === 0) labels = uniqueDates;

            let accumulated = 0;
            const dataPoints = labels.map(date => {
                const dayInc = filteredData.filter(t => t.date === date && t.type === 'ingreso').reduce((a,b)=>a+b.amount,0);
                const dayExp = filteredData.filter(t => t.date === date && t.type === 'gasto').reduce((a,b)=>a+b.amount,0);
                accumulated += (dayInc - dayExp);
                return accumulated;
            });

            // Control de Ruido: Media Móvil solo si hay >= 3 días con datos
            const daysWithData = labels.filter(date => {
                return filteredData.some(t => t.date === date);
            }).length;
            const showSMA = daysWithData >= 3;

            const datasets = [
                {
                    label: 'Balance Neto',
                    data: dataPoints,
                    borderColor: '#1c46bb',
                    backgroundColor: 'rgba(28, 70, 187, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: labels.length > 15 ? 0 : 4,
                    pointBackgroundColor: '#1c46bb',
                    borderWidth: 3
                }
            ];

            if (showSMA) {
                const smaData = dataPoints.map((val, idx, arr) => {
                    if (idx < 2) return val;
                    return (arr[idx] + arr[idx-1] + arr[idx-2]) / 3;
                });
                datasets.push({
                    label: 'Media Móvil (3d)',
                    data: smaData,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                });
            }

            const trendTitle = showSMA 
                ? 'Tendencia Temporal con Media Móvil' 
                : 'Tendencia Temporal';
            const trendSubtitle = !showSMA && daysWithData > 0
                ? 'Media móvil disponible a partir de 3 registros temporales'
                : null;

            this.charBalTrend = new Chart(ctxTrend.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels.map(d => d.split('-').pop()),
                    datasets
                },
                options: {
                    maintainAspectRatio: false,
                    scales: {
                        y: { border: {display: false}, grid: {color: 'rgba(255,255,255,0.05)'}, ticks: {callback: v => v>=1000?`$${v/1000}k`:`$${v}`, font:{size:10}} },
                        x: { grid: {display: false}, ticks: {font:{size:9}, maxRotation: 0} }
                    },
                    plugins: { 
                        title:{display:true, text: trendTitle, color:'#f8fafc', font:{size:14, weight:'600'}},
                        subtitle: { display: !!trendSubtitle, text: trendSubtitle || '', color: '#94a3b8', font: { size: 11, style: 'italic' }, padding: { bottom: 10 } },
                        legend: { display: showSMA, position: 'top', labels: { boxWidth: 12, color: '#94a3b8', font: {size: 10} } }, 
                        tooltip: { mode: 'index', intersect: false, callbacks: { label: c => ` ${c.dataset.label}: ${formatCOP.format(c.raw)}` } } 
                    }
                }
            });
        }

        // 5to Grafico: Ranking de Gastos (rankingChart)
        const ctxRank = document.getElementById('rankingChart');
        if(ctxRank) {
            if(this.charRank) this.charRank.destroy();
            const sortedRank = Object.entries(maps).sort((a, b) => b[1] - a[1]);
            const backgroundColorsRank = sortedRank.map(x => DataService.state.categoryColors[x[0]] || '#f43f5e');
            
            this.charRank = new Chart(ctxRank.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sortedRank.map(x => x[0]),
                    datasets: [{
                        label: 'Gasto por Categoría',
                        data: sortedRank.map(x => x[1]),
                        backgroundColor: backgroundColorsRank,
                        borderRadius: 4
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    indexAxis: 'y', // barras horizontales
                    scales: {
                        x: { display: false },
                        y: { border: {display: false}, grid: {display: false}, ticks: {color: '#94a3b8'} }
                    },
                    plugins: { 
                        title:{display:true, text:'Ranking de Categorías', color:'#f8fafc', font:{size:14, weight:'600'}},
                        legend: {display: false}, 
                        tooltip: { callbacks: { label: c => ` ${formatCOP.format(c.raw)}` } } 
                    }
                }
            });
        }
    },

    showToast(msg, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '🚨';
        toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
        container.appendChild(toast);

        // Limpiar el DOM después que la animación CSS finalice (aprox 3.5s)
        setTimeout(() => toast.remove(), 4000);
    }
};

/* =========================================================
   5. APP CONTROLLER (Bootstrapper)
   ========================================================= */
const App = {
    async init() {
        const loader = document.getElementById('app-loader');
        const authModal = document.getElementById('auth-modal');

        try {
            // Manejar primero el resultado de un posible redirect de Google Auth PWA
            try {
                if (loader) loader.classList.remove('hidden'); // Mantener loader activo mientras procesa redirect
                const result = await getRedirectResult(auth);
                if (result) {
                    UIController.showToast(`Bienvenido con Google ✨`, 'success');
                }
            } catch (redirErr) {
                console.error("Error post-redirect Google:", redirErr);
                UIController.showToast(UIController.getAuthErrorMessage(redirErr), 'danger');
            }

            // Escuchar cambios de autenticación
            onAuthStateChanged(auth, async (user) => {
                try {
                    if (user) {
                        authModal.classList.add('hidden');
                        await DataService.init(user.uid);
                        await DataService.migrateFromLocalStorage();
                        
                        document.getElementById('user-display-name').textContent = user.displayName || user.email;
                        document.getElementById('user-display-id').textContent = `ID: ${user.uid.substring(0, 8)}...`;
                        
                        const settingsEmail = document.getElementById('settings-user-email');
                        if (settingsEmail) settingsEmail.textContent = user.email;
                        
                        // Check Onboarding
                        if (!localStorage.getItem('finance_onboarding_done')) {
                            const onbModal = document.getElementById('onboarding-modal');
                            if (onbModal) onbModal.classList.remove('hidden');
                        }
                    } else {
                        authModal.classList.remove('hidden');
                    }
                } catch (e) {
                    console.error("Error en cambio de estado de Auth:", e);
                } finally {
                    if (loader) loader.classList.add('hidden');
                }
            });

            // Fecha actual global forms
            const localNow = new Date();
            const localDateStr = new Date(localNow.getTime() - (localNow.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const dateInput = document.getElementById('date');
            if(dateInput) dateInput.value = localDateStr;

            // Boot UI
            UIController.initListeners();

            // Listeners Globales Modal Historial
            const btnHistoryClose = document.getElementById('btn-close-history');
            if(btnHistoryClose) btnHistoryClose.onclick = () => document.getElementById('goal-history-modal').classList.add('hidden');
            const btnHistoryCloseBottom = document.getElementById('btn-close-history-bottom');
            if(btnHistoryCloseBottom) btnHistoryCloseBottom.onclick = () => document.getElementById('goal-history-modal').classList.add('hidden');
        } catch (error) {
            console.error("Error crítico en App.init:", error);
            if (loader) loader.classList.add('hidden');
        }
    },

    syncDashboard() {
        UIController.updateUI();
        FinanceEngine.runRecurringChecks();
    }
};

App.init();
