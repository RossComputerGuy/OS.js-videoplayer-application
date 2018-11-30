import osjs from "osjs";
import {name as applicationName} from "./metadata.json";

import {
	h,
	app
} from "hyperapp";

import {
	Box,BoxContainer,Button,Icon,Menubar,MenubarItem,Video
} from "@osjs/gui";

const createAboutDialog = (core,_) => {
	core.make("osjs/dialogs").create({
		buttons: ["ok"],
		window: { title: _("ABOUT_TITLE"), dimension: { width: 500, height: 200 } }
	},dialog => null,(btn,value) => {
		return value;
	}).render(($content,dialogWindow,dialog) => {
		dialog.app = app({},{},
		(state,actions) => dialog.createView([
			h(Box,{ grow: 1, padding: false },[
				h(BoxContainer,{},_("ABOUT_VERSION")),
				h(BoxContainer,{},_("ABOUT_DEV")),
				h(BoxContainer,{},_("ABOUT_LICENSE")),
				h(BoxContainer,{},_("ABOUT_DESCRIPTION"))
			])
		]),$content);
	});
};

const view = (core,proc,win,_) => (state,actions) => h(Box,{},[
	h(Menubar,{},[
		h(MenubarItem,{ onclick: ev => actions.menu(ev) },_("MENU_FILE")),
		h(MenubarItem,{ onclick: ev => createAboutDialog(core,_) },_("MENU_ABOUT"))
	]),
	h(Box,{ grow: 1, shrink: 1 },[
		state.video ? h(Video,{ src: state.video.url, onload: ev => win.resizeFit(ev.target) }) : null
		/* TODO: custom controls */
	].filter(i => !!i)),
]);

const openFile = async (core,proc,win,a,file,_) => {
	const url = await core.make("osjs/vfs").url(file);
	const ref = Object.assign({}, file, {url});
	if(file.mime.match(/^video/)) a.setVideo(ref);
	win.setTitle(_("WIN_TITLE_PLAYING",file.filename));
	proc.args.file = file;
};

const register = (core,args,options,metadata) => {
	const bus = core.make("osjs/event-handler","VideoPlayer");
	const {translatable} = core.make("osjs/locale");
	const _ = translatable(require("./locales.js"));
	const proc = core.make("osjs/application",{args,options,metadata});
	proc.createWindow({
		id: "VideoPlayerWindow",
		title: _("WIN_TITLE"),
		icon: proc.resource(metadata.icon || "icon.png"),
		dimension: { width: 640, height: 480 }
	}).on("destroy",() => proc.destroy())
	.on("render",win => win.focus())
	.on("drop",(ev,data) => {
		if(data.isFile && data.mime) {
			const found = metadata.mimes.find(m => (new RegExp(m)).test(data.mime));
			if(found) bus.emit("readFile",data);
		}
	}).render(($content,win) => {
		const a = app({
			video: null
		},{
			setVideo: video => state => ({video}),
			menu: ev => state => {
				core.make("osjs/contextmenu").show({
					menu: [
						{ label: _("FILE_OPEN"), onclick: () => {
							core.make("osjs/dialog","file",{ type: "open", mime: metadata.mimes },(btn,item) => {
								if(btn == "ok") bus.emit("readFile",item);
							});
						} },
						{ label: _("FILE_QUIT"), onclick: () => proc.destroy() }
					],
					position: ev.target
				});
			}
		},view(core,proc,win,_),$content);
		bus.on("readFile",file => openFile(core,proc,win,a,file,_));
		if(args.file) bus.emit("readFile",args.file);
	});
	return proc;
};
osjs.register(applicationName,register);
