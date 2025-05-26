import { ElMessage, ElLoading } from "element-plus";

function show_error(error, title = ""){
    if(error == undefined){
        return;
    }
    
    let error_str = typeof error == 'string' ? error : "";

    if(error_str == ""){
        // error是一个对象，判断是否有msg或message属性
        if(error.msg){
            error_str = error.msg;
        }else if(error.message){
            error_str = error.message;
        }
    }

    error_str = title == "" ? error_str : title + ": <br />" + error_str;
    

    ElMessage.error({
        dangerouslyUseHTMLString: true,
        message: error_str,
    });
}

function show_loading(text){
    const loading = ElLoading.service({
        lock: true,
        text: text,
        background: 'rgba(0, 0, 0, 0.7)',
    })

    return {
        close: function(){
            loading.close();
        },
        loading
    }
}

function deepCopy(obj){
    return JSON.parse(JSON.stringify(obj));
}

function stringToBoolean(str) {
    if (str === 'true') {
        return true;
    } else if (str === 'false') {
        return false;
    } else {
        return false;
    }
}

export {
    show_error, show_loading, deepCopy, stringToBoolean
}