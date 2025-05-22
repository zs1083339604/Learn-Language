import {createRouter, createWebHistory} from 'vue-router'

import Language from '../pages/Language.vue'
import LanguageAdd from '../pages/LanguageAdd.vue'
import SetPage from '../pages/SetPage.vue'

const routes = [
    { path: '/', redirect: '/language'},
    { path: '/set', component: SetPage },
    { 
        path: '/language', 
        component: Language,
        children: [
            {
                name: 'add',
                path: 'add/:id',
                component: LanguageAdd
            }
        ]
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router;