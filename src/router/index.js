import {createRouter, createWebHistory} from 'vue-router'

import Language from '../pages/Language.vue'
import LanguageAdd from '../pages/LanguageAdd.vue'
import SetPage from '../pages/SetPage.vue'
import Class from '../pages/Class.vue'
import AddClass from '../pages/class/Add.vue'

const routes = [
    { path: '/', redirect: '/language'},
    { path: '/set', component: SetPage },
    { 
        path: '/language', 
        component: Language
    },
    { 
        path: '/class', 
        component: Class,
        children: [
            {
                name: 'add',
                path: 'add/:id',
                component: AddClass
            }
        ]
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router;