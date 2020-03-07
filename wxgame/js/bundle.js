(function () {
    'use strict';

    class AutoMove extends Laya.Script{
        constructor(){
            super();
            this.moveSpeed=20;
        }
        onAwake(){
            this.height=this.owner.height;

            Laya.timer.frameLoop(1,this,this.frameLoop);
        }

        frameLoop(){
            this.owner.y+=this.moveSpeed;

            if(this.owner.y>=this.height){
                this.owner.y-=this.height*2;
            }
        }
    }

    class StartPanel extends Laya.Script{
        constructor(){
            super();
            /** @prop {name:btn_Paly, tips:'提示文本', type:Node, default:null} */
            this.btn_Paly=null;
            /** @prop {name:btn_AudioOn, tips:'提示文本', type:Node, default:null} */
            this.btn_AudioOn=null;
            /** @prop {name:btn_AudioOff, tips:'提示文本', type:Node, default:null} */
            this.btn_AudioOff=null;
        }

        onAwake(){
            this.btn_Paly.on(Laya.Event.CLICK,this,this.btnPlayClick);
            this.btn_AudioOn.on(Laya.Event.CLICK,this,this.btnAudioOnClick);
            this.btn_AudioOff.on(Laya.Event.CLICK,this,this.btnAudioOffClick);
            Laya.stage.on('Mute',this,this.IsMute);
        }
        btnPlayClick(){
            this.owner.visible=false;
            Laya.stage.event('StartGame');  //没点play的时候不能控制
            Laya.SoundManager.playSound('res/Sounds/ButtonClick.ogg',1);
        }
        btnAudioOnClick(){
            this.btn_AudioOff.visible=true;
            this.btn_AudioOn.visible=false;
            Laya.SoundManager.playSound('res/Sounds/ButtonClick.ogg',1);
            Laya.SoundManager.muted=true;
            Laya.stage.event('Mute',true);
        }
        btnAudioOffClick(){
            this.btn_AudioOff.visible=false;
            this.btn_AudioOn.visible=true;
            Laya.SoundManager.muted=false;
            Laya.stage.event('Mute',false);
        }
        HomeButtonClick(){
            this.owner.visible=true;
            
        }
        IsMute(value){
            if(value){
                this.btn_AudioOn.visible=false;
                this.btn_AudioOff.visible=true;
            }else{
                this.btn_AudioOn.visible=true;
                this.btn_AudioOff.visible=false;
            }
        }
    }

    class Car extends Laya.Script{
        constructor(){
            super();
            /** @prop {name:speed, tips:'提示文本'，type:number} */
            this.speed=15;
        }
        onAwake(){
            Laya.timer.frameLoop(1,this,this.frameLoop);
        }
        Init(sign){
            this.sign=sign;
        }
        frameLoop(){
            this.owner.y+=this.speed;
        }
        onTriggerExit(other){   
            if(other.label=='BottomCollider'){
                this.owner.removeSelf();
                this.recover();
            }
        }
        /**
         * 回收
         */
        recover(){
            Laya.Pool.recover(this.sign,this.owner);
        }
    }

    class Player extends Laya.Script{
        constructor(){
            super();
            this.playerMinX=200;
            this.playerMaxX=880;

            this.isStartGame=false;//没点play的时候不能控制
            //小汽车初始位置x坐标数组
            this.initXArr=[260,450,640,820];
        }

        onAwake(){
            Laya.SoundManager.playMusic('res/Sounds/FutureWorld_Dark_Loop_03.ogg',0);
            Laya.stage.on(Laya.Event.MOUSE_DOWN,this,this.mouseDown);
            Laya.stage.on(Laya.Event.MOUSE_UP,this,this.mouseUp);
            Laya.stage.on('StartGame',this,function(){//没点play的时候不能控制
                this.isStartGame=true;//没点play的时候不能控制
            });
            Laya.stage.on('Pause',this,function(){
                this.isStartGame=false;
            });
            //获取自身刚体组件
            this.rig=this.owner.getComponent(Laya.RigidBody);
            
            this.Reset();//调用小汽车初始位置方法
        }
        Reset(){
            //随机小汽车初始位置
            var index=this.getRandom(0,this.initXArr.length-1);
            this.owner.pos(this.initXArr[index],1360);
        }
        mouseDown(){
            if(this.isStartGame==false) return;  //没点play的时候不能控制

            if(Laya.stage.mouseY<500) return;
            
            var mouseX=Laya.stage.mouseX;
            var force=0;
            if(mouseX<Laya.stage.width/2){
                //left
                force=-1;
            }else {
                //right
                force=1;
            }
            this.rig.linearVelocity={x:force*8,y:0};
            Laya.Tween.to(this.owner,{rotation:force*25},300);
        }
        mouseUp(){
            this.rig.linearVelocity={x:0,y:0};
            Laya.Tween.to(this.owner,{rotation:0},300);
        }

        onUpdate(){
            if(this.owner.x>this.playerMaxX){
                this.owner.x=this.playerMaxX;
            }
            if(this.owner.x<this.playerMinX){
                this.owner.x=this.playerMinX;
            }
        }
        onTriggerEnter(other){
            if(other.label=='Car'){
                Laya.SoundManager.playSound('res/Sounds/CarCrash.ogg',1);
                //游戏结束
                Laya.stage.event('GameOver');
                this.isStartGame=false;
            }
            if(other.label=='Coin'){
                Laya.SoundManager.playSound('res/Sounds/Bonus.ogg',1);
                other.owner.removeSelf();
                other.owner.getComponent(Car).recover();
                //记分
               Laya.stage.event('AddScore',10);
            }
        }
        /**
         * 获取随机数 左闭右闭区间
         * @param {*最小值} min 
         * @param {*最大值} max 
         */
        getRandom(min,max){
            var value=Math.random()*(max-min);
            value=Math.round(value);
            return min+value;
        }
    }

    class GameManager extends Laya.Script{

        constructor(){
            super();
            this.carPrefabArr=[];
            this.spawnCarArr=[];
            this.isStartGame=false; //点play之前不生成小汽车
            // /** @prop {name:car_1, tips:'提示文本', type:prefab, default:null} */
            // this.car_1=null;
            // /** @prop {name:car_2, tips:'提示文本', type:prefab, default:null} */
            // this.car_2=null;
            // /** @prop {name:car_3, tips:'提示文本', type:prefab, default:null} */
            // this.car_3=null;
            // /** @prop {name:car_4, tips:'提示文本', type:prefab, default:null} */
            // this.car_4=null;
            // /** @prop {name:car_5, tips:'提示文本', type:prefab, default:null} */
            // this.car_5=null;
            // /** @prop {name:car_6, tips:'提示文本', type:prefab, default:null} */
            // this.car_6=null;
        }
        onAwake(){  
            Laya.stage.on('StartGame',this,function(){this.isStartGame=true;});//点play之前不生成小汽车
            Laya.stage.on('GameOver',this,this.gameOver);
            this.loadCarPrefab();      
        }
        loadCarPrefab(){
            var pathArr=[
                'prefab/Car_1.json',
                'prefab/Car_2.json',
                'prefab/Car_3.json',
                'prefab/Car_4.json',
                'prefab/Car_5.json',
                'prefab/Car_6.json',
                'prefab/Coin.json',
            ];
            var infoArr=[];
            for(var i=0;i<pathArr.length;i++){
                infoArr.push({url:pathArr[i],type:Laya.Loader.PREFAB});
            }
            
            Laya.loader.load(infoArr,Laya.Handler.create(this,function(result){
                for(var i=0;i<pathArr.length;i++){
                    this.carPrefabArr.push(Laya.loader.getRes(pathArr[i]));
                }
                this.ranTime=this.getRandom(500,1000);
                Laya.timer.loop(this.ranTime,this,function(){
                    this.spawn();
                    this.ranTime=this.getRandom(500,1000);
                });
            }));
        }
      
        spawn(){
            if(!this.isStartGame)return;//点play之前不生成小汽车
            var arrX=[190,380,570,760];
            var y=-300;
            var x=arrX[this.getRandom(0,arrX.length-1)];
            
            var carIndex=this.getRandom(0,this.carPrefabArr.length-1);

            var car=Laya.Pool.getItemByCreateFun(carIndex.toString(),function(){return this.carPrefabArr[carIndex].create()},this);
            Laya.stage.getChildAt(0).getChildAt(0).addChild(car);
            car.pos(x,y);
            car.getComponent(Car).Init(carIndex.toString());
            this.spawnCarArr.push(car);
        }
        
        /**
         * 获取随机数 左闭右闭区间
         * @param {*最小值} min 
         * @param {*最大值} max 
         */
        getRandom(min,max){
            var value=Math.random()*(max-min);
            value=Math.round(value);
            return min+value;
        }

        /**
         * 游戏结束
         */
        gameOver(){
            this.isStartGame=false; 
            this.spawnCarArr.forEach(element => {
                element.removeSelf();
            });
        }
        //当Home按钮点击的时候调用
        HomeButtonClick(){
            this.gameOver();
        }
        RestartButtonclick(){
            this.spawnCarArr.forEach(element => {
                element.removeSelf();
            });
        }
    }

    class GamePanel extends Laya.Script{
        constructor(){
            super();
            this.score=0;
            
        }
        onAwake(){
            this.txt_Best=this.owner.getChildByName('txt_Best');
            this.txt_Last=this.owner.getChildByName('txt_Last');
            this.txt_Score=this.owner.getChildByName('txt_Score');
            this.owner.getChildByName('btn_Pause').on(Laya.Event.CLICK,this,this.pauseBtnClick);

            Laya.loader.load('font.ttf',Laya.Handler.create(this,function(font){
                this.txt_Best.font=font.fontName;
                this.txt_Last.font=font.fontName;
                this.txt_Score.font=font.fontName;
            }),null,Laya.Loader.TTF);

            this.owner.visible=false;
            Laya.stage.on('StartGame',this,function(){this.owner.visible=true;this.Init();});
            Laya.timer.loop(300,this,this.AddScore);
            Laya.stage.on('AddScore',this,this.AddScore);
            Laya.stage.on('GameOver',this,function(){this.owner.visible=false;});

        }
        Init(){
            this.txt_Last.text='Last:'+ Number(Laya.LocalStorage.getItem('LastScore'));
            this.txt_Best.text='Best:'+ Number(Laya.LocalStorage.getItem('BestScore'));
            this.txt_Score.text='0';
            this.score=0;

        }
        //增加分数
        AddScore(score=1){
            if(this.owner.visible==false) return;
            this.score+=score;
            this.txt_Score.text=this.score;
        }
        pauseBtnClick(){
            Laya.SoundManager.playSound('res/Sounds/ButtonClick.ogg',1);
            Laya.timer.pause();
            this.owner.visible=false;
            Laya.stage.event('Pause');
        }
    }

    class PausePanel extends Laya.Script{
        constructor(){
            super();
            
        }
        onAwake(){
            Laya.loader.load('font.ttf',Laya.Handler.create(this,function(font){
                this.owner.getChildByName('txt_Pause').font=font.fontName;
            }),null,Laya.Loader.TTF);

            this.owner.getChildByName('btn_Home').on(Laya.Event.CLICK,this,function(){
                Laya.SoundManager.playSound('res/Sounds/ButtonClick.ogg',1);
                Laya.timer.resume();
                this.owner.visible=false;
                this.owner.parent.getChildByName('StartPanel').getComponent(StartPanel).HomeButtonClick();
                this.owner.parent.getComponent(GameManager).HomeButtonClick();
                this.owner.parent.getChildByName('player').getComponent(Player).Reset();
            });
            this.owner.getChildByName('btn_Close').on(Laya.Event.CLICK,this,function(){
                Laya.SoundManager.playSound('res/Sounds/ButtonClick.ogg',1);
                Laya.timer.resume();
                this.owner.visible=false;
                this.owner.parent.getChildByName('GamePanel').visible=true;
                this.owner.parent.getChildByName('player').getComponent(Player).isStartGame=true;
            });
            this.owner.getChildByName('btn_Restart').on(Laya.Event.CLICK,this,function(){
                Laya.SoundManager.playSound('res/Sounds/ButtonClick.ogg',1);
                Laya.timer.resume();
                this.owner.visible=false;
                this.owner.parent.getComponent(GameManager).RestartButtonclick();
                Laya.stage.event('StartGame');
                this.owner.parent.getChildByName('player').getComponent(Player).Reset();
            });
            this.btn_AudioOn=this.owner.getChildByName('btn_AudioOn');
            this.btn_AudioOff=this.owner.getChildByName('btn_AudioOff');
            this.btn_AudioOn.on(Laya.Event.CLICK,this,function(){
                Laya.SoundManager.playSound('res/Sounds/ButtonClick.ogg',1);
                this.btn_AudioOn.visible=false;
                this.btn_AudioOff.visible=true;
                Laya.SoundManager.muted=true; 
                Laya.stage.event('Mute',true);
            });
            this.btn_AudioOff.on(Laya.Event.CLICK,this,function(){
                Laya.SoundManager.playSound('res/Sounds/ButtonClick.ogg',1);
                this.btn_AudioOn.visible=true;
                this.btn_AudioOff.visible=false;
                Laya.SoundManager.muted=false;
                Laya.stage.event('Mute',false);
            });
            Laya.stage.on('Pause',this,function(){this.owner.visible=true;});
            Laya.stage.on('Mute',this,this.IsMute);
        }
        IsMute(value){
            if(value){
                this.btn_AudioOn.visible=false;
                this.btn_AudioOff.visible=true;
            }else{
                this.btn_AudioOn.visible=true;
                this.btn_AudioOff.visible=false;
            }
        }
    }

    class GameOverPanel extends Laya.Script{
        constructor(){
            super();
        }
        onAwake(){
            this.txt_Score=this.owner.getChildByName('txt_Score');
            this.txt_HeightScore=this.owner.getChildByName('txt_HeightScore');
            Laya.loader.load('font.ttf',Laya.Handler.create(this,function(font){
                this.owner.getChildByName('txt_Over').font=font.fontName;
                this.txt_Score.font=font.fontName;
                this.txt_HeightScore.font=font.fontName;
            }),null,Laya.Loader.TTF);

            this.owner.getChildByName('btn_Home').on(Laya.Event.CLICK,this,function(){
                Laya.SoundManager.playSound('res/Sounds/ButtonClick.ogg',1);
                this.owner.visible=false;
                this.owner.parent.getChildByName('StartPanel').getComponent(StartPanel).HomeButtonClick();
                this.owner.parent.getComponent(GameManager).HomeButtonClick();
                this.owner.parent.getChildByName('player').getComponent(Player).Reset();
            });

            this.owner.getChildByName('btn_Restart').on(Laya.Event.CLICK,this,function(){
                Laya.SoundManager.playSound('res/Sounds/ButtonClick.ogg',1);
                this.owner.visible=false;
                this.owner.parent.getComponent(GameManager).RestartButtonclick();
                Laya.stage.event('StartGame');
                this.owner.parent.getChildByName('player').getComponent(Player).Reset();
            });

            Laya.stage.on('GameOver',this,this.gameOver);
        }
        gameOver(){
            this.owner.visible=true;
            var currentScore=this.owner.parent.getChildByName('GamePanel').getComponent(GamePanel).score;
            this.txt_Score.text='Score:'+currentScore;
            var heightScore=Number(Laya.LocalStorage.getItem('BestScore'));
            if(currentScore>heightScore){
                Laya.LocalStorage.setItem('BestScore',currentScore);
                this.txt_HeightScore.text='HeightScore:'+currentScore;
            }else{
                this.txt_HeightScore.text='HeightScore:'+heightScore;
            }
            Laya.LocalStorage.setItem('LastScore',currentScore);
        }
    }

    /**This class is automatically generated by LayaAirIDE, please do not make any modifications. */

    class GameConfig {
        static init() {
            //注册Script或者Runtime引用
            let reg = Laya.ClassUtils.regClass;
    		reg("scripts/AutoMove.js",AutoMove);
    		reg("scripts/StartPanel.js",StartPanel);
    		reg("scripts/Player.js",Player);
    		reg("scripts/GameManager.js",GameManager);
    		reg("scripts/GamePanel.js",GamePanel);
    		reg("scripts/PausePanel.js",PausePanel);
    		reg("scripts/GameOverPanel.js",GameOverPanel);
    		reg("scripts/Car.js",Car);
        }
    }
    GameConfig.width = 1080;
    GameConfig.height = 1920;
    GameConfig.scaleMode ="showall";
    GameConfig.screenMode = "none";
    GameConfig.alignV = "middle";
    GameConfig.alignH = "center";
    GameConfig.startScene = "Main.scene";
    GameConfig.sceneRoot = "";
    GameConfig.debug = false;
    GameConfig.stat = false;
    GameConfig.physicsDebug = false;
    GameConfig.exportSceneToJson = true;

    GameConfig.init();

    class Main {
    	constructor() {
    		//根据IDE设置初始化引擎		
    		if (window["Laya3D"]) Laya3D.init(GameConfig.width, GameConfig.height);
    		else Laya.init(GameConfig.width, GameConfig.height, Laya["WebGL"]);
    		Laya["Physics"] && Laya["Physics"].enable();
    		Laya["DebugPanel"] && Laya["DebugPanel"].enable();
    		Laya.stage.scaleMode = GameConfig.scaleMode;
    		Laya.stage.screenMode = GameConfig.screenMode;
    		Laya.stage.alignV = GameConfig.alignV;
    		Laya.stage.alignH = GameConfig.alignH;
    		//兼容微信不支持加载scene后缀场景
    		Laya.URL.exportSceneToJson = GameConfig.exportSceneToJson;

    		//打开调试面板（通过IDE设置调试模式，或者url地址增加debug=true参数，均可打开调试面板）
    		if (GameConfig.debug || Laya.Utils.getQueryString("debug") == "true") Laya.enableDebugPanel();
    		if (GameConfig.physicsDebug && Laya["PhysicsDebugDraw"]) Laya["PhysicsDebugDraw"].enable();
    		if (GameConfig.stat) Laya.Stat.show();
    		Laya.alertGlobalError = true;

    		//激活资源版本控制，version.json由IDE发布功能自动生成，如果没有也不影响后续流程
    		Laya.ResourceVersion.enable("version.json", Laya.Handler.create(this, this.onVersionLoaded), Laya.ResourceVersion.FILENAME_VERSION);
    	}

    	onVersionLoaded() {
    		//激活大小图映射，加载小图的时候，如果发现小图在大图合集里面，则优先加载大图合集，而不是小图
    		Laya.AtlasInfoManager.enable("fileconfig.json", Laya.Handler.create(this, this.onConfigLoaded));
    	}

    	onConfigLoaded() {
    		//加载IDE指定的场景
    		GameConfig.startScene && Laya.Scene.open(GameConfig.startScene);
    	}
    }
    //激活启动类
    new Main();

}());
