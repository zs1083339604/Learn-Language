import { ElMessage } from "element-plus";

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

export {
    show_error
}