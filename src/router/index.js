import {createRouter, createWebHistory} from 'vue-router'

import Language from '../pages/Language.vue'
import SetPage from '../pages/SetPage.vue'
import Class from '../pages/Class.vue'
import AddClass from '../pages/class/Add.vue'
import Word from '../pages/Word.vue'
import AddWord from '../pages/Word/Add.vue'
import ListClass from '../pages/Class/List.vue'
import ShowClass from '../pages/Class/Show.vue'

const routes = [
    { path: '/', redirect: '/language/add'},
    { path: '/set', component: SetPage },
    { 
        name: "language",
        path: '/language', 
        children: [
            {
                name: 'addLanguage',
                path: 'add',
                component: Language
            }
        ]
    },
    { 
        name: "class",
        path: '/class', 
        component: Class,
        children: [
            {
                name: 'addClass',
                path: 'add/:id',
                component: AddClass
            },{
                name: 'listClass',
                path: 'list/:id',
                component: ListClass
            },{
                name: 'showClass',
                path: 'show/:id',
                component: ShowClass
            }
        ]
    },
    { 
        name: 'word',
        path: '/word', 
        component: Word,
        children: [
            {
                name: 'addWrod',
                path: 'add/:id',
                component: AddWord
            }
        ]
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router;