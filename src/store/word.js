import { defineStore } from 'pinia';
import { insert } from '../utils/sqlite';

export const useWordStore = defineStore('word', {
    actions: {
        
    },
    state(){
        return {
            words: []
        }
    }
});