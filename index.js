import osjs from "osjs";
import {name as applicationName} from "./metadata.json";

import {
	h,
	app
} from "hyperapp";

import {
	Box,BoxContainer,Menubar,MenubarItem,Video
} from "@osjs/gui";

const createAboutDialog = core => {
	core.make("osjs/dialogs").create({
		buttons: ["ok"],
		window: { title: "Send Message", dimension: { width: 500, height: 200 } }
	},dialog => {
		return dialog.app.getState();
	},(btn,value) => {
		return value;
	}).render(($content,dialogWindow,dialog) => {
		dialog.app = app({
			from: "", to: "", body: ""
		},{
			setInput: ({ name, value }) => () => ({[name]: value}),
			getState: () => state => state
		},
		(state,actions) => dialog.createView([
			h(Box,{ grow: 1, padding: false },[
				h(BoxContainer,{},"Video Player - Version 1.0.0"),
				h(BoxContainer,{},"Developed By Spaceboy Ross (https://youtube.com/c/SpaceboyRoss)"),
				h(BoxContainer,{},"Licenced under Apache 2.0"),
				h(BoxContainer,{},"A simple video player for OS.js V3 based on the Preview application for OS.js V3.")
			])
		]),$content);
	});
};

const view = (core,proc,win) => (state,actions) => h(Box,{},[
	h(Menubar,{},[
		h(MenubarItem,{ onclick: ev => actions.menu(ev) }, "File"),
		h(MenubarItem,{ onclick: ev => createAboutDialog(core) },"About")
	]),
	h(BoxContainer,{ grow: 1, shrink: 1 },[
		state.video ? h(Video,{ src: state.video.url, onload: (ev) => win.resizeFit(ev.target) }) : null
	].filter(i => !!i)),
]);

const openFile = async (core,proc,win,a,file) => {
	const url = await core.make("osjs/vfs").url(file);
	const ref = Object.assign({}, file, {url});
	if(file.mime.match(/^video/)) a.setVideo(ref);
	win.setTitle(`${proc.metadata.title.en_EN} - ${file.filename}`);
	proc.args.file = file;
};

const register = (core,args,options,metadata) => {
	const bus = core.make("osjs/event-handler","VideoPlayer");
	const proc = core.make("osjs/application",{args,options,metadata});
	proc.createWindow({
		id: "VideoPlayerWindow",
		title: metadata.title.en_EN,
		dimension: { width: 640, height: 480 }
	}).on("destroy",() => proc.destroy())
		.on("render",win => win.focus())
		.on("drop",(ev,data) => {
			if(data.isFile && data.mime) {
				const found = metadata.mimes.find(m => (new RegExp(m)).test(data.mime));
				if(found) bus.emit('readFile', data);
			}
		}).render(($content, win) => {
			const a = app({
				video: null
			},{
				setVideo: video => state => ({video}),
				menu: ev => state => {
					core.make("osjs/contextmenu").show({
						menu: [
							{ label: "Open", onclick: () => {
								core.make('osjs/dialog',"file",{ type: "open", mime: metadata.mimes },(btn,item) => {
									if(btn == "ok") bus.emit("readFile",item);
								});
							} },
							{ label: "Quit", onclick: () => proc.destroy() }
						],
						position: ev.target
					});
				}
			},view(core,proc,win),$content);
		bus.on("readFile",file => openFile(core,proc,win,a,file));
		if(args.file) bus.emit("readFile",args.file);
	});
	return proc;
};
osjs.register(applicationName,register);
