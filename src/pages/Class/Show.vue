<script setup lang="ts">
    import { ref } from 'vue';
    import Breadcrumb from '../../components/Breadcrumb.vue';
    import {useRouter, useRoute} from 'vue-router'

    const router = useRouter();
    const route = useRoute();
    const classId = ref(route.params.id);
    
</script>

<template>
    <div class="class-show-div">
        <div class="class-show-header">
            <Breadcrumb :text="classId"/>
        </div>
        阅读课文
    </div>
</template>

<style scoped>
    
</style>