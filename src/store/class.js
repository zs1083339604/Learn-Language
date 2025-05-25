import { defineStore } from "pinia";
import { insert, select } from "../utils/sqlite";

export const useClassStore = defineStore("class", {
    actions: {
        
    },
    state(){
        return {
            class: []
        }
    }
});