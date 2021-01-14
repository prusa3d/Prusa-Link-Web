import "./styles.css";

if (process.env.TYPE == "SL1"){
    require("./sl1") ;
}else{
    console.log(`Hello ${process.env.TYPE}`);
}
