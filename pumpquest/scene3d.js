/* PumpQuest Release 1.0 — three distinct original procedural WebGL characters, no CDN required.
   This is actual perspective 3D geometry with orbit/pinch controls, not a static illustration. */
(function(root){
'use strict';
const EPS=.00001, PI=Math.PI;
const V=(x=0,y=0,z=0)=>[x,y,z];
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]);
const mul=(a,k)=>a.map(x=>x*k),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{let n=Math.hypot(...a);return n>EPS?mul(a,1/n):[0,1,0]};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const id=()=>[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
const mm=(a,b)=>{let o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o};
const trans=(x,y,z)=>[1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
const scale=(x,y,z)=>[x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1];
const ry=a=>[Math.cos(a),0,-Math.sin(a),0, 0,1,0,0, Math.sin(a),0,Math.cos(a),0, 0,0,0,1];
const rx=a=>[1,0,0,0, 0,Math.cos(a),Math.sin(a),0, 0,-Math.sin(a),Math.cos(a),0, 0,0,0,1];
const rz=a=>[Math.cos(a),Math.sin(a),0,0, -Math.sin(a),Math.cos(a),0,0, 0,0,1,0, 0,0,0,1];
const perspective=(fov,aspect,near,far)=>{let f=1/Math.tan(fov/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]};
function lookAt(eye,center,up=[0,1,0]){const z=norm(sub(eye,center)),x=norm(cross(up,z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]}
function geo(){return {v:[],n:[],i:[]}}
function vertex(g,p,n){g.v.push(...p);g.n.push(...n);return g.v.length/3-1}
function tri(g,a,b,c){g.i.push(a,b,c)}
function uvBall(rows=27,cols=36,rough=0,seed=0){const g=geo();for(let y=0;y<=rows;y++){let theta=PI*y/rows;for(let x=0;x<=cols;x++){let phi=2*PI*x/cols,sn=Math.sin(theta);let nx=sn*Math.cos(phi),ny=Math.cos(theta),nz=sn*Math.sin(phi),rad=1;
 if(rough){const n=Math.sin(nx*19+seed)*Math.sin(ny*17.5+seed*.73)*Math.sin(nz*15+seed*.43)+Math.sin(nx*31+ny*13+nz*7+seed)*.4;rad+=n*rough}
 vertex(g,[nx*rad,ny*rad,nz*rad],[nx,ny,nz]);}}
for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){let a=y*(cols+1)+x,b=a+cols+1;tri(g,a,a+1,b);tri(g,b,a+1,b+1);}return g}
function coneMesh(segments=14){const g=geo();const a=vertex(g,[0,0,0],[0,-1,0]);const b=vertex(g,[0,1,0],[0,1,0]);for(let i=0;i<=segments;i++){let t=2*PI*i/segments,c=Math.cos(t),s=Math.sin(t);vertex(g,[c,0,s],[c,.35,s]);vertex(g,[c*.025,1,s*.025],[c,.4,s]);}
for(let i=0;i<segments;i++){let j=2+2*i;tri(g,j,j+1,j+2);tri(g,j+1,j+3,j+2);tri(g,a,j+2,j)}return g}
function octa(){let g=geo(),p=[[0,1,0],[1,0,0],[0,0,1],[-1,0,0],[0,0,-1],[0,-1,0]];for(let q of [[0,2,1],[0,3,2],[0,4,3],[0,1,4],[5,1,2],[5,2,3],[5,3,4],[5,4,1]]){const a=p[q[0]],b=p[q[1]],c=p[q[2]],n=norm(cross(sub(b,a),sub(c,a))),v=q.map(k=>vertex(g,p[k],n));tri(g,...v)}return g}
function tube(points,radii,segments=12){const g=geo();for(let j=0;j<points.length;j++){const tangent=norm(sub(points[Math.min(j+1,points.length-1)],points[Math.max(0,j-1)]));let side=norm(cross(Math.abs(tangent[1])>.88?[1,0,0]:[0,1,0],tangent)),bit=norm(cross(tangent,side));for(let i=0;i<=segments;i++){let t=2*PI*i/segments,n=norm(add(mul(side,Math.cos(t)),mul(bit,Math.sin(t))));vertex(g,add(points[j],mul(n,radii[j])),n)}}for(let j=0;j<points.length-1;j++)for(let i=0;i<segments;i++){let a=j*(segments+1)+i,b=a+segments+1;tri(g,a,a+1,b);tri(g,b,a+1,b+1)}return g}
function yAxisTransform(a,b,r1,r2){const dir=sub(b,a),dy=Math.hypot(...dir);let y=norm(dir),x=norm(cross(Math.abs(y[2])>.92?[0,1,0]:[0,0,1],y)),z=cross(x,y);return [x[0]*r1,x[1]*r1,x[2]*r1,0,y[0]*dy,y[1]*dy,y[2]*dy,0,z[0]*r2,z[1]*r2,z[2]*r2,0,...a,1]}
const MATERIALS={skin:[.46,.285,.198],skinLight:[.54,.352,.255],muzzle:[.31,.25,.21],dark:[.10,.12,.15],nose:[.19,.15,.14],fur:[.83,.79,.69],furDark:[.47,.43,.39],iron:[.35,.41,.47],steel:[.52,.57,.64],gold:[.83,.58,.28],goldBright:[.92,.71,.36],leather:[.23,.17,.13],brown:[.34,.23,.16],horn:[.51,.36,.25],tip:[.88,.75,.55],rock:[.15,.22,.31],gem:[.18,.71,1.0],ice:[.48,.83,1.0],black:[.08,.08,.09],shell:[.07,.30,.33],shellPlate:[.19,.54,.50],ridge:[.14,.45,.46],lava:[.95,.22,.08],tooth:[.88,.80,.62],scale:[.22,.32,.32]};
const PALETTES={
 bruiser:{},
 shell:{skin:[.12,.40,.40],skinLight:[.26,.60,.55],muzzle:[.12,.39,.40],fur:[.25,.62,.59],furDark:[.07,.31,.34],iron:[.21,.46,.52],steel:[.39,.70,.69],gold:[.61,.54,.34],goldBright:[.81,.74,.43],leather:[.10,.28,.34],brown:[.24,.53,.51],horn:[.30,.73,.73],tip:[.64,.98,.90],nose:[.10,.25,.29],gem:[.20,.95,.87],ice:[.42,1,.90]},
 kaiju:{skin:[.21,.27,.31],skinLight:[.29,.37,.39],muzzle:[.17,.23,.27],fur:[.32,.38,.41],furDark:[.10,.15,.19],iron:[.30,.33,.38],steel:[.43,.48,.51],gold:[.64,.32,.17],goldBright:[.93,.45,.16],leather:[.17,.16,.18],brown:[.22,.22,.23],horn:[.30,.28,.28],tip:[.60,.51,.46],nose:[.09,.13,.16],gem:[1,.35,.10],ice:[1,.57,.19],ridge:[.44,.18,.15],scale:[.17,.22,.26]}
};
const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNormal;
uniform mat4 uM,uV,uP; uniform float uBreath;
out vec3 vN,vWorld,vLocal;
void main(){vec3 p=aPos; p.xz*=1.0+uBreath;vec4 wp=uM*vec4(p,1.);vWorld=wp.xyz;vLocal=p;vN=normalize(transpose(inverse(mat3(uM)))*aNormal);gl_Position=uP*uV*wp;}`;
const FS=`#version 300 es
precision highp float;
in vec3 vN,vWorld,vLocal;out vec4 frag;
uniform vec3 uColor,uGlow,uEye;uniform float uMetal,uRough,uTime,uHot,uCold,uFur,uMatType,uQuality,uSculpt;uniform vec2 uRegionHeat[19];
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec2 paintHeat(vec3 p){
 float a=abs(p.x); bool front=p.z>0.0;
 if(p.y>4.8&&a<1.15)return uRegionHeat[13];
 if(p.y>4.35&&a<1.05&&front)return uRegionHeat[0];
 if(p.y>4.0&&a<1.05&&front)return uRegionHeat[1];
 if(p.y>4.3&&a>1.06){if(!front)return uRegionHeat[4];return a>1.43?uRegionHeat[3]:uRegionHeat[2];}
 if(p.y>3.35&&a>1.35)return front?uRegionHeat[5]:uRegionHeat[6];
 if(p.y>2.14&&a>1.55)return uRegionHeat[7];
 if(p.y>3.0&&p.y<4.1&&a<.62&&front)return uRegionHeat[8];
 if(p.y>3.0&&p.y<4.0&&a<1.1&&front)return uRegionHeat[9];
 if(p.y>3.2&&p.y<4.35&&!front)return a>.54?uRegionHeat[12]:uRegionHeat[14];
 if(p.y>2.8&&p.y<3.3&&!front)return uRegionHeat[15];
 if(p.y>2.0&&p.y<2.8&&!front)return uRegionHeat[16];
 if(p.y>1.45&&p.y<2.8)return front?(a<.4?uRegionHeat[11]:uRegionHeat[10]):uRegionHeat[17];
 if(p.y<1.45)return uRegionHeat[18];
 return vec2(0.0);
}
void main(){
 vec3 p=vWorld;vec3 n=normalize(vN);vec3 surface=uColor;
 // Cinematic material layering. Procedural micro detail is anchored to the world,
 // so rotating the camera does not make the textures swim over the surface.
 float coarse=noise(p*5.4),micro=noise(p*41.0),fine=noise(p*121.0);
 float fur=clamp(uFur,0.,1.),metal=clamp(uMetal,0.,1.);
 float material=uMatType;
 float fiber=.5+.5*sin(p.y*148.+sin(p.x*33.)*2.1+p.z*46.);
 float skinPore=mix(micro,fine*.55+micro*.45,.34);
 float stoneVein=smoothstep(.68,.78,noise(p*15.+vec3(coarse*5.)));
 float engraved=pow(abs(sin(p.y*57.0+p.x*15.0+coarse*3.0)),38.0);
 if(material<.5){ // organic skin: pores, muscle striation and subtle color variation
    float folds=.5+.5*sin(p.y*24.+p.x*13.+sin(p.z*12.)*2.);
    surface *= .83+.24*coarse+.11*skinPore+.024*folds;
 }else if(material<1.5){ // fibrous mane, beard and fur
    surface *= .64+.38*fiber+.22*micro;
 }else if(material<2.5){ // forged metal with fine etched wear
    surface *= .68+.3*coarse+.16*engraved+.10*micro;
 }else if(material<3.5){ // worn leather
    surface *= .72+.28*coarse+.16*micro;
 }else if(material<4.5){ // striated horn and bone
    surface *= .72+.22*coarse+.12*abs(sin(p.y*37.+p.x*11.));
 }else if(material<5.5){ // crystalline accents
    surface *= .90+.14*coarse;
 }else{ // mineral and reptile plates
    surface *= .67+.3*coarse+.12*stoneVein+.09*micro;
 }
 // Very small geometry-independent normal perturbation: readable sculpted detail,
 // while avoiding high-cost dynamic normal maps on mobile GPUs.
 if(uQuality>.5){
   float bump=(micro-.5)*.085+(fine-.5)*.035;
   if(material>1.5&&material<2.5)bump*=.48;
   n=normalize(n+vec3(bump,-bump*.65,bump*.45));
 }
 vec3 key=normalize(vec3(-.57,.87,1.14));
 vec3 fill=normalize(vec3(.83,.42,.58));
 vec3 bounce=normalize(vec3(-.3,-.4,.4));
 vec3 coolRim=normalize(vec3(.31,.48,-.90));
 vec3 view=normalize(vec3(-p.x*.036,3.45-p.y,11.-p.z));
 float nl=max(dot(n,key),0.);float nf=max(dot(n,fill),0.);
 float nr=max(dot(n,coolRim),0.);
 float nb=max(dot(n,bounce),0.);
 float facing=clamp(dot(n,view),0.,1.);
 float rim=pow(1.-facing,3.2);
 float cavity=.85+.15*smoothstep(.15,.9,nl);
 float occlusion=mix(1.,.83,smoothstep(0.1,0.8,coarse));
 vec3 direct=vec3(1.18,.93,.73)*nl*.98+vec3(.24,.51,.77)*nf*.45;
 vec3 bounceLight=vec3(.18,.28,.33)*nb*.25;
 vec3 ambient=vec3(.13,.17,.24);
 vec3 color=surface*(ambient+direct+bounceLight)*cavity*occlusion;
 // Artist-directed highlights: metallic specularity, leather softness, skin sheen.
 vec3 H=normalize(key+view);
 float gloss=mix(18.,104.,metal);
 if(material<.5)gloss=29.;
 if(material>1.5&&material<2.5)gloss=105.;
 if(material>4.5&&material<5.5)gloss=182.;
 float sp=pow(max(dot(n,H),0.),gloss);
 float fresnel=pow(1.-facing,5.);
 vec3 reflectance=mix(vec3(.068),surface*.77+.08,metal);
 color+=reflectance*sp*(.64+2.9*metal);
 color+=vec3(.12,.39,.73)*nr*.28+vec3(.31,.68,1.)*rim*.22;
 color+=reflectance*fresnel*(.10+.21*metal);
 // Glow is tied only to actual logged muscle activity, never fake recovery advice.
 vec2 bodyHeat=uSculpt>.5?paintHeat(p):vec2(0.0);
 color+=vec3(1.0,.24,.09)*(uHot+bodyHeat.x)*(.12+.42*rim)+vec3(.04,.48,.96)*(uCold+bodyHeat.y)*(.14+.45*rim);
 color+=uGlow*(.75+.22*sin(uTime*1.0));
 // ACES filmic tonemapping gives metallics controlled highlights instead of neon white.
 color=max(color,vec3(0.0));
 color=(color*(2.51*color+.03))/(color*(2.43*color+.59)+.14);
 color=pow(clamp(color,0.,1.),vec3(.94));
 frag=vec4(color,1.0);
}`;
const PVS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;layout(location=2) in vec4 aSeed;uniform mat4 uV,uP;uniform float uTime,uKind;out float vAlpha;out float vSeed;
void main(){float t=mod(uTime*(.14+aSeed.w*.10)+aSeed.x*17.,6.7)/6.7;vec3 p=aPos;p.y+=t*(uKind>1.5?8.4:uKind>.5?5.1:7.3);p.x+=sin(t*(uKind>.5?8.:5.)+aSeed.x*21.)*(uKind>.5?.41:.23)*aSeed.y;p.z+=cos(t*7.+aSeed.z*19.)*.14;gl_Position=uP*uV*vec4(p,1.);gl_PointSize=mix(uKind>.5&&uKind<1.5?4.5:2.9,8.0,aSeed.y)*(1.-t*.6);vAlpha=sin(t*3.14159)*.7;vSeed=aSeed.z;}`;
const PFS=`#version 300 es
precision highp float;
in float vAlpha,vSeed;out vec4 frag;uniform vec3 uTint;uniform float uKind;
void main(){vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;float a=pow(1.-d,1.5)*vAlpha;vec3 c=mix(uTint,vec3(1.,.89,.67),step(.82,vSeed));if(uKind>1.5){a*=.65;c=mix(c,vec3(1.,.53,.19),.35);}frag=vec4(c,a);}`;
function shader(gl,v,f){const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};let p=gl.createProgram(),a=compile(gl.VERTEX_SHADER,v),b=compile(gl.FRAGMENT_SHADER,f);gl.attachShader(p,a);gl.attachShader(p,b);gl.bindAttribLocation(p,0,'aPos');gl.bindAttribLocation(p,1,'aNormal');gl.bindAttribLocation(p,2,'aSeed');gl.linkProgram(p);gl.deleteShader(a);gl.deleteShader(b);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
function gpuMesh(gl,g){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const attrib=(data,slot,size)=>{let buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);gl.enableVertexAttribArray(slot);gl.vertexAttribPointer(slot,size,gl.FLOAT,false,0,0)};attrib(g.v,0,3);attrib(g.n,1,3);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(g.i),gl.STATIC_DRAW);gl.bindVertexArray(null);return{vao,count:g.i.length}}
// Continuous 7k-vertex sculpt replaces the visible spherical body parts with
// one smooth anatomical surface. All source data is original and cached offline.
function decodeSculpt(gl){
 const raw=root.PQ_SCULPT;if(!raw)return null;
 const unpack=(s,signed)=>{const bytes=Uint8Array.from(atob(s),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer),a=[];for(let i=0;i<bytes.length;i+=2)a.push(signed?view.getInt16(i,true):view.getUint16(i,true));return a};
 const xyz=unpack(raw.vertices,true).map(v=>v/1000),normals=unpack(raw.normals,true).map(v=>v/32767),idx=unpack(raw.indices,false);
 if(xyz.length/3!==raw.count||normals.length!==xyz.length||idx.length!==raw.triangles*3||idx.some(i=>i>=raw.count))throw Error('Corrupt sculpt geometry');
 return gpuMesh(gl,{v:xyz,n:normals,i:idx});
}
function geometryLib(gl){return {ball:gpuMesh(gl,uvBall()),fur:gpuMesh(gl,coneMesh()),gem:gpuMesh(gl,octa()),rock:gpuMesh(gl,uvBall(25,32,.19,2.4)),sculpt:decodeSculpt(gl)}}
function bodyNodes(gl,lib,character='bruiser'){const nodes=[],hasSculpt=!!lib.sculpt;const attach=(geometry,material,pos=[0,0,0],sz=[1,1,1],opts={})=>{nodes.push({geometry,material,position:pos,scale:sz,rz:opts.rz||0,rx:opts.rx||0,ry:opts.ry||0,region:opts.region||'',glow:opts.glow||0,metal:opts.metal||0,fur:opts.fur||0,motion:opts.motion||'',axis:opts.axis||null,name:opts.name||''});return nodes[nodes.length-1]};
if(hasSculpt)attach(lib.sculpt,'skin',[0,0,0],[1,1,1],{name:'sculpt-body',motion:'chest'});
const ell=(m,p,s,o={})=>hasSculpt&&o.region&&['skin','skinLight'].includes(m)?null:attach(lib.ball,m,p,s,o), fur=(a,b,r,m='fur',opts={})=>attach(lib.fur,m,a,[1,1,1],{...opts,axis:[a,b,r]}),stone=(p,s)=>attach(lib.rock,'rock',p,s,{metal:.2});
const pipe=(pts,radii,mat='horn',opts={})=>attach(gpuMesh(gl,tube(pts,radii)) ,mat,[0,0,0],[1,1,1],opts);
// Footing: layered rock instead of a flat stage.
for(let i=0;i<11;i++){let x=Math.cos(i*2.4)*(.7+(i%3)*.4),z=Math.sin(i*2.4)*(.8+(i%3)*.22);stone([x,-.27-(i%3)*.06,z],[.65+(i%3)*.2,.28+(i%2)*.14,.6]);}
stone([0,-.35,0],[1.55,.32,1.1]);
// Legs: four sculpted volumes per leg, dark joints and ornamented boots.
for(let s of [-1,1]){
 ell('skin',[s*.65,2.18,.10],[.52,.82,.52],{rz:-s*.09,region:'quads'});
 ell('skinLight',[s*.66,1.88,.33],[.43,.50,.40],{region:'quads'});
 ell('skin',[s*.68,1.24,-.03],[.33,.36,.36],{region:'hamstrings'});
 ell('iron',[s*.73,.89,.04],[.34,.55,.35],{region:'calves',metal:.65});
 ell('furDark',[s*.77,.63,.02],[.44,.20,.46],{fur:.8});
 ell('leather',[s*.77,.32,.26],[.48,.29,.69],{metal:.08});
 ell('steel',[s*.75,.29,.65],[.39,.13,.30],{metal:.7});
 for(let k=0;k<3;k++)ell('gold',[s*.76,.57+k*.15,.35],[.35,.034,.09],{metal:.95});
 for(let k=0;k<8;k++){const a=k*PI*2/8;fur([s*.77+Math.cos(a)*.34,.69,.04+Math.sin(a)*.34],[s*.77+Math.cos(a)*.48,.40,.04+Math.sin(a)*.45],.092,k%3?'fur':'furDark',{fur:1});}
}
// Pelvis and armor skirt under torso.
ell('skin',[0,2.73,.0],[1.03,.52,.59],{region:'abs'});
ell('leather',[0,2.35,.06],[.9,.46,.6],{metal:.1});
for(let s of [-1,1]){
 ell('leather',[s*.68,2.33,.35],[.45,.56,.19],{rz:-s*.30});
 ell('gold',[s*.71,2.65,.55],[.35,.06,.08],{metal:.86});
 for(let k=0;k<5;k++)fur([s*(.35+k*.115),2.53,.52],[s*(.35+k*.125),1.92-(k%2)*.18,.61],.072,k%2?'furDark':'fur',{fur:1});
}
// Core and ribcage, anatomically shaped groups rather than one sphere.
ell('skin',[0,3.87,-.08],[1.04,1.23,.62],{region:'abs',motion:'chest'});
ell('skinLight',[0,3.35,.40],[.74,.75,.23],{region:'abs',motion:'chest'});
for(let s of [-1,1]){
 ell('skin',[s*.60,4.5,.37],[.71,.42,.38],{region:'upperChest',rz:s*.08,motion:'chest'});
 ell('skinLight',[s*.60,4.19,.50],[.62,.30,.29],{region:'lowerChest',motion:'chest'});
 ell('skin',[s*.92,3.90,-.07],[.36,.85,.43],{region:'lats',rz:s*.2,motion:'chest'});
 ell('skinLight',[s*.77,3.36,.34],[.28,.65,.25],{region:'obliques',rz:s*.14,motion:'chest'});
 ell('skin',[s*.44,4.43,-.61],[.66,.51,.30],{region:'midBack',motion:'chest'});
 ell('skin',[s*.72,3.88,-.58],[.42,.80,.32],{region:'lats',motion:'chest'});
 ell('skin',[s*.51,3.28,-.48],[.35,.40,.27],{region:'lowerBack'});
 for(let j=0;j<3;j++)ell('skinLight',[s*.23,3.76-j*.30,.55],[.24,.133,.15],{region:'abs',motion:'chest'});
}
// Massive trapezius collar and shoulders.
ell('skin',[0,4.85,-.23],[1.12,.38,.62],{region:'traps',motion:'chest'});
for(let s of [-1,1]){
 ell('skinLight',[s*1.24,4.64,.05],[.69,.66,.64],{rz:s*.21,region:'sideDelts',motion:'chest'});
 ell('skin',[s*1.48,4.48,.39],[.41,.37,.30],{region:'frontDelts',motion:'chest'});
 ell('skin',[s*1.46,4.51,-.45],[.40,.42,.25],{region:'rearDelts'});
 ell('skin',[s*1.59,3.82,.03],[.45,.68,.42],{rz:s*.09,region:'biceps'});
 ell('skinLight',[s*1.63,3.76,.35],[.37,.54,.24],{region:'biceps'});
 ell('skin',[s*1.66,3.77,-.35],[.31,.53,.24],{region:'triceps'});
 ell('dark',[s*1.79,3.19,.05],[.27,.28,.29]);
 ell('skin',[s*1.82,2.82,.10],[.37,.53,.37],{rz:-s*.06,region:'forearms'});
 ell('iron',[s*1.85,2.80,.31],[.39,.44,.30],{region:'forearms',metal:.72});
 ell('leather',[s*1.93,2.42,.11],[.40,.24,.41]);
 ell('gold',[s*1.92,2.48,.45],[.37,.052,.14],{metal:.8});
 ell('skinLight',[s*1.9,2.21,.18],[.38,.32,.43]);
 for(let t=0;t<4;t++)ell('skin',[s*(1.65+t*.13),2.05,.43],[.105,.18,.15]);
 // Shoulder plating in hammered iron; gold inset trims.
 ell('iron',[s*1.27,4.77,-.20],[.56,.26,.43],{rz:s*.13,metal:.76});
 ell('gold',[s*1.40,4.91,.02],[.34,.08,.12],{metal:.96});
 ell('dark',[s*1.43,4.58,.31],[.25,.12,.09],{metal:.4});
 for(let k=0;k<5;k++){let yy=4.80-k*.21;fur([s*(1.10+k*.10),yy,-.38],[s*(1.35+k*.12),yy-.25,-.53],.085,k%2?'fur':'furDark',{fur:1});}
}
// Belt and artisan-crafted buckle.
ell('leather',[0,2.95,.22],[.93,.23,.58]);
for(let k=-4;k<=4;k++)ell('gold',[k*.17,2.94,.76-Math.abs(k)*.025],[.064,.15,.052],{metal:.85});
attach(lib.gem,'gold',[0,2.96,.83],[.26,.30,.12],{metal:.9});
attach(lib.gem,'gem',[0,2.96,.96],[.13,.20,.09],{glow:.36,metal:.55});
// Three separate, recognizable, fully rotatable original 3D heads and silhouettes.
if(character==='bruiser'){
 // Stormhorn: carved horn spirals, shaggy ice mane, detailed muzzle and glowing eyes.
 ell('skin',[0,5.12,0],[.48,.42,.45],{motion:'head'});
 ell('furDark',[0,5.27,-.32],[.69,.64,.60],{fur:1,motion:'head'});
 ell('skinLight',[0,5.56,.10],[.60,.61,.49],{motion:'head'});
 ell('muzzle',[0,5.27,.55],[.43,.27,.40],{motion:'head'});
 ell('nose',[0,5.26,.88],[.31,.12,.17],{motion:'head'});
 for(let s of [-1,1]){
  ell('black',[s*.15,5.28,1.01],[.065,.035,.04],{motion:'head'});
  ell('brown',[s*.27,5.68,.49],[.31,.17,.18],{rz:-s*.22,motion:'head'});
  ell('dark',[s*.28,5.57,.54],[.17,.11,.09],{motion:'head'});
  ell('ice',[s*.28,5.60,.62],[.09,.06,.06],{glow:.86,motion:'head'});
  ell('furDark',[s*.51,5.34,-.09],[.30,.20,.17],{motion:'head'});
  // Heavy bent horns deliberately narrower than v0.4 so neither gets clipped on mobile.
  const pts=[[s*.44,5.88,-.05],[s*.66,6.15,-.10],[s*.99,6.32,-.17],[s*1.40,6.39,-.20],[s*1.65,6.66,-.21],[s*1.62,6.96,-.20],[s*1.43,7.08,-.17]];
  pipe(pts,[.28,.29,.26,.22,.16,.09,.004],'horn',{motion:'head'});
  // Engraved horn cuffs.
  for(let j=0;j<3;j++)ell('gold',[s*(.72+j*.15),6.18+j*.05,-.04],[.06,.028,.11],{metal:.85,motion:'head'});
  for(let k=0;k<11;k++){
   const a=k/10*PI*.85,x=s*(.41+.24*Math.sin(a)),y=5.80+.22*Math.cos(a);
   fur([x,y,-.1],[x+s*.09,y+.16+(k%3)*.08,-.20],.095,k%4?'fur':'furDark',{fur:1,motion:'head'});
  }
  for(let k=0;k<13;k++){
   const x=s*(.09+k*.033),y=5.12-(k%4)*.035,z=.76-(k%3)*.028;
   fur([x,y,z],[x+s*.035,4.49+(k%3)*.1,z+.06],.071,k%3?'fur':'furDark',{fur:1,motion:'head'});
  }
 }
 for(let i=0;i<8;i++)fur([-.18+i*.051,5.13,.85],[-.23+i*.07,4.36-(i%3)*.12,.87],.084,i%3?'fur':'furDark',{fur:1,motion:'head'});
 for(let s of [-1,1])for(let k=0;k<14;k++){
  let a=k*PI*2/14,x=s*1.12+Math.cos(a)*.35,z=-.23+Math.sin(a)*.35;
  fur([x,4.55,z],[x+s*.12,4.06-(k%4)*.10,z],.068,k%2?'furDark':'fur',{fur:1});
 }
}else if(character==='shell'){
 // Abyss Warden: rounded tortoise face and an enormous segmented shell on the BACK.
 ell('skin',[0,5.20,0],[.40,.43,.47],{motion:'head'});
 ell('skinLight',[0,5.52,.15],[.70,.53,.56],{motion:'head'});
 ell('muzzle',[0,5.31,.63],[.53,.20,.43],{motion:'head'});
 ell('horn',[0,5.22,.85],[.31,.11,.23],{motion:'head'});
 ell('dark',[0,5.16,1.04],[.33,.025,.045],{motion:'head'});
 for(let s of [-1,1]){
  ell('dark',[s*.33,5.61,.56],[.21,.16,.13],{motion:'head'});
  ell('ice',[s*.33,5.62,.67],[.105,.09,.055],{glow:.86,motion:'head'});
  ell('skin',[s*.62,5.42,-.08],[.31,.20,.25],{motion:'head'});
  // Leaf-like cheek fins and ridges, distinct from a bull silhouette.
  fur([s*.60,5.68,-.18],[s*.87,6.16,-.21],.16,'shellPlate',{motion:'head',metal:.35});
  for(let i=0;i<3;i++)fur([s*(.15+i*.13),5.99,.04],[s*(.24+i*.14),6.19+(i%2)*.05,.02],.07,'ridge',{motion:'head'});
 }
 // Thick unmistakable domed shell, visible on rotation.
 ell('dark',[0,3.94,-.76],[1.36,1.49,.66],{region:'lats'});
 ell('shell',[0,3.96,-.97],[1.31,1.45,.64],{region:'midBack',metal:.2});
 ell('shellPlate',[0,4.12,-1.55],[.56,.72,.17],{metal:.27});
 for(let k=0;k<8;k++){
  let a=2*PI*k/8;
  ell(k%2?'shellPlate':'ridge',[Math.cos(a)*.92,3.95+Math.sin(a)*1.06,-1.34],[.37,.47,.18],{rz:-a,metal:.2});
 }
 for(let k=0;k<12;k++){
  const a=k*PI*2/12;
  ell('gold',[Math.cos(a)*1.29,3.95+Math.sin(a)*1.36,-.84],[.105,.15,.12],{metal:.85});
 }
 // Shoulder armor + twin original water-crystal pylons (not weapon cannons).
 for(let s of [-1,1]){
  ell('shell',[s*1.29,4.78,-.15],[.54,.30,.47],{metal:.30});
  fur([s*1.24,4.82,-.34],[s*1.45,5.48,-.37],.20,'shellPlate',{metal:.4});
  attach(lib.gem,'gem',[s*1.45,5.46,-.35],[.16,.33,.15],{glow:.55,metal:.3});
  for(let j=0;j<3;j++)fur([s*(1.70+j*.06),2.08,.39],[s*(1.7+j*.06),1.85,.60],.10,'tooth');
 }
}else{
 // Cinder Drake: reptilian snout, coral-like dorsal fins, talons and tapering tail.
 ell('skin',[0,5.16,-.03],[.50,.41,.42],{motion:'head'});
 ell('scale',[0,5.56,.10],[.60,.59,.59],{motion:'head'});
 ell('skinLight',[0,5.30,.62],[.48,.24,.56],{motion:'head'});
 ell('muzzle',[0,5.20,.88],[.42,.14,.43],{motion:'head'});
 ell('dark',[0,5.145,.97],[.35,.028,.33],{motion:'head'});
 for(let s of [-1,1]){
  ell('dark',[s*.27,5.61,.56],[.20,.15,.12],{motion:'head'});
  ell('lava',[s*.28,5.62,.66],[.09,.085,.05],{glow:1,motion:'head'});
  ell('black',[s*.24,5.31,1.08],[.045,.029,.03],{motion:'head'});
  ell('ridge',[s*.48,5.63,-.22],[.24,.19,.27],{motion:'head'});
  for(let k=0;k<5;k++)fur([s*(.13+k*.09),5.12,.85],[s*(.13+k*.09),4.96,.88],.053,'tooth',{motion:'head'});
  for(let k=0;k<3;k++)fur([s*(.32+k*.11),5.93,-.10],[s*(.39+k*.15),6.29+(k%2)*.09,-.16],.14,'ridge',{metal:.25,motion:'head'});
 }
 // Floating geometry of massive plated dorsal scales down the spine.
 for(let k=0;k<7;k++){
  let y=5.64-k*.47,sz=.38+k*.036;
  attach(lib.gem,k%2?'ridge':'lava',[0,y,-.75],[sz,.53,.25],{rx:-.34,glow:k%2?.05:.15});
  fur([0,y,-.70],[0,y+.66,-1.02],.22,'ridge');
 }
 pipe([[0,2.72,-.48],[0,2.48,-1.12],[0,2.05,-1.86],[.03,1.65,-2.40],[.10,1.40,-2.97],[.05,1.46,-3.42]], [.50,.44,.35,.26,.14,.012],'skin',{region:'glutes'});
 for(let k=0;k<6;k++){
   let z=-1.25-k*.34,y=2.38-k*.17;
   fur([0,y,z],[0,y+.29+(5-k)*.07,z-.05],.13,'ridge');
 }
 for(let s of [-1,1]){
  for(let j=0;j<3;j++)fur([s*(.56+j*.16),.22,.70],[s*(.56+j*.16),.18,1.02],.105,'tooth');
  for(let j=0;j<3;j++)fur([s*(1.68+j*.12),2.05,.44],[s*(1.67+j*.12),1.78,.61],.095,'tooth');
  fur([s*1.28,4.95,-.20],[s*1.48,5.45,-.16],.20,'ridge');
 }
}
// Real equipable 3D cosmetics. Hidden until unlocked and equipped.
for(let side of [-1,1]){
 ell('goldBright',[side*1.92,2.35,.44],[.40,.15,.18],{name:'gear-wraps',metal:.95});
 ell('goldBright',[side*1.92,2.16,.45],[.40,.24,.25],{name:'gear-gold',metal:.95});
 for(let f=0;f<3;f++)ell('gold',[side*1.93,2.24-f*.10,.66],[.30,.025,.055],{name:'gear-gold',metal:.9});
 ell('black',[side*.27,5.62,.73],[.20,.13,.12],{name:'gear-shades',metal:.5});
 ell('steel',[side*.28,5.64,.79],[.18,.03,.03],{name:'gear-shades',metal:.85});
}
ell('gold',[0,6.30,.24],[.42,.17,.34],{name:'gear-crown',metal:.95});
for(let i=-3;i<=3;i++){
 let x=i*.13;fur([x,6.32,.32],[x,6.53+(3-Math.abs(i))*.065,.35],.065,'goldBright',{name:'gear-crown',metal:.98});
}
attach(lib.gem,'gem',[0,6.42,.57],[.11,.14,.07],{name:'gear-crown',glow:.65,metal:.7});
// Rune tattoos and stone shards on the 3D armor.
for(let s of [-1,1]){
 attach(lib.gem,'gem',[s*1.46,4.87,.15],[.10,.16,.07],{glow:.40,metal:.65});
 for(let k=0;k<3;k++)attach(lib.gem,k%2?'steel':'gold',[s*1.91,2.90-k*.20,.57],[.075,.095,.045],{metal:.85});
}
for(let k=0;k<5;k++){let t=k*2*PI/5;stone([Math.cos(t)*2.1,-.32,Math.sin(t)*1.2],[.37,.30,.46]);}
return nodes}
function init(canvas){let gl=canvas.getContext('webgl2',{antialias:true,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
 const webgl2=!!gl;
 if(!gl){gl=canvas.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});if(!gl)throw Error('WebGL unavailable');
   const ext=gl.getExtension('OES_vertex_array_object');if(!ext)throw Error('WebGL vertex arrays unavailable');
   gl.createVertexArray=()=>ext.createVertexArrayOES();gl.bindVertexArray=(v)=>ext.bindVertexArrayOES(v);
 }
 const upgrade=(src,fragment=false)=>{
  if(webgl2)return src;
  let code=src.replace('#version 300 es','').replace(/layout\(location=\d+\) in/g,'attribute');
  if(fragment){code=code.replace(/\bin\b/g,'varying').replace(/out vec4 frag;/,'').replace(/\bfrag\s*=/g,'gl_FragColor =')}
  else code=code.replace(/\bout\b/g,'varying');
  code=code.replace('transpose(inverse(mat3(uM)))','mat3(uM)');return code;
 };
 const p=shader(gl,upgrade(VS),upgrade(FS,true)),pp=shader(gl,upgrade(PVS),upgrade(PFS,true));let lib=geometryLib(gl),models={bruiser:bodyNodes(gl,lib,'bruiser')},character='bruiser',nodes=models.bruiser;
 const get=(prog,s)=>gl.getUniformLocation(prog,s),uni={P:get(p,'uP'),V:get(p,'uV'),M:get(p,'uM'),time:get(p,'uTime'),color:get(p,'uColor'),glow:get(p,'uGlow'),metal:get(p,'uMetal'),rough:get(p,'uRough'),hot:get(p,'uHot'),cold:get(p,'uCold'),fur:get(p,'uFur'),matType:get(p,'uMatType'),quality:get(p,'uQuality'),sculpt:get(p,'uSculpt'),regions:get(p,'uRegionHeat[0]'),breath:get(p,'uBreath')};
 const pUni={P:get(pp,'uP'),V:get(pp,'uV'),time:get(pp,'uTime'),tint:get(pp,'uTint'),kind:get(pp,'uKind')};
 const pbuf=gl.createVertexArray();gl.bindVertexArray(pbuf);const pv=[],ps=[];for(let i=0;i<110;i++){let a=i*2.399963,rad=.5+(i%11)*.16;pv.push(Math.cos(a)*rad,.05+(i%9)*.46,Math.sin(a)*.9);ps.push((i*.75487766)%1,(i*.414213)%1,(i*.332718)%1,(i*.193)%1);}for(let [loc,arr,sz] of [[0,pv,3],[2,ps,4]]){let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,gl.FLOAT,false,0,0)}gl.bindVertexArray(null);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
 let quality='cinematic',accent='default',gear={aura:'base',head:'base',outfit:'base'},angle=-.12,targetAngle=-.12,zoom=12.15,targetZoom=12.15,active=true,anim=0,last=0,raf=0,mode='storm',zones={},pumps={},focused=false,spin=null,touches=new Map(),lastPinch=0;
 const colors={storm:[.24,.72,1],tide:[.15,1,.82],ember:[1,.41,.18]};
 const resize=()=>{const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);let ratio=Math.min(devicePixelRatio||1,quality==='cinematic'?2:1.15),width=Math.floor(w*ratio),height=Math.floor(h*ratio);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}gl.viewport(0,0,width,height)};
 const touchDown=e=>{if(e.target!==canvas)return;canvas.setPointerCapture(e.pointerId);touches.set(e.pointerId,[e.clientX,e.clientY]);if(touches.size===2){let pts=[...touches.values()];lastPinch=Math.hypot(pts[0][0]-pts[1][0],pts[0][1]-pts[1][1])}spin=e.clientX};
 const touchMove=e=>{if(!touches.has(e.pointerId))return;let prev=touches.get(e.pointerId);touches.set(e.pointerId,[e.clientX,e.clientY]);if(touches.size===1)targetAngle+=clamp((e.clientX-prev[0])*.011,-.22,.22);else if(touches.size===2){let pts=[...touches.values()],dist=Math.hypot(pts[0][0]-pts[1][0],pts[0][1]-pts[1][1]);targetZoom=clamp(targetZoom-(dist-lastPinch)*.015,10.5,15.6);lastPinch=dist}};
 const touchUp=e=>{touches.delete(e.pointerId);spin=null};
 canvas.addEventListener('pointerdown',touchDown);canvas.addEventListener('pointermove',touchMove);canvas.addEventListener('pointerup',touchUp);canvas.addEventListener('pointercancel',touchUp);
 canvas.addEventListener('wheel',e=>{if(e.cancelable)e.preventDefault();targetZoom=clamp(targetZoom+Math.sign(e.deltaY)*.35,10.5,15.6)},{passive:false});
 function draw(t){if(!active)return;raf=requestAnimationFrame(draw);if(t-last<(quality==='cinematic'?33:48))return;last=t;resize();anim=t*.001;angle+=(targetAngle-angle)*.12;zoom+=(targetZoom-zoom)*.10;
 gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 let aspect=canvas.width/canvas.height,P=perspective(.82,aspect,.1,90),eye=[Math.sin(angle)*zoom,3.22+Math.sin(angle*.3)*.2,Math.cos(angle)*zoom],Vw=lookAt(eye,[0,3.36,0]);let pulse=Math.sin(anim*.70)*.005;
 gl.useProgram(p);gl.uniformMatrix4fv(uni.P,false,new Float32Array(P));gl.uniformMatrix4fv(uni.V,false,new Float32Array(Vw));gl.uniform1f(uni.time,anim);gl.uniform1f(uni.quality,quality==='cinematic'?1:0);
 const regionOrder=['upperChest','lowerChest','frontDelts','sideDelts','rearDelts','biceps','triceps','forearms','abs','obliques','quads','adductors','lats','traps','midBack','lowerBack','glutes','hamstrings','calves'];
 const regionHot=new Float32Array(regionOrder.flatMap(k=>{const z=zones[k],pump=pumps[k]||0;return [(z?.status==='hot'?0.65:z?.status==='warm'?0.28:0)+Math.min(1,pump)*.3,z?.status==='cold'?.75:0]}));
 gl.uniform2fv(uni.regions,regionHot);
 const tint=gear.aura==='cosmic'?[.72,.26,1]:gear.aura==='mint'?[.16,1,.73]:gear.aura==='pulse'?[1,.77,.33]:gear.aura==='shock'?[.3,.72,1]:accent==='pink'?[1,.45,.7]:accent==='amber'?[1,.65,.32]:accent==='teal'?[.2,1,.83]:accent==='lime'?[.65,1,.4]:colors[mode]||colors.storm;
 for(const n of nodes){if(n.name?.startsWith('gear-')){const eq=n.name.substring(5);if(eq!==gear.head&&eq!==gear.outfit)continue}let breath=n.motion==='chest'?pulse:n.motion==='head'?pulse*.3:0,pos=n.position.slice(),s=n.scale.slice();const pump=(n.region&&pumps[n.region])||0;if(pump&&n.region!=='traps'){const boost=1+.07*Math.min(1,pump);s=s.map(v=>v*boost)}if(n.motion==='head'){pos[0]+=Math.sin(anim*.34)*.016;pos[1]+=Math.sin(anim*.78)*.009}
 let mat;if(n.axis){const [a,b,r]=n.axis;mat=yAxisTransform(a,b,r,r)}else mat=mm(mm(mm(mm(trans(...pos),rz(n.rz)),ry(n.ry)),rx(n.rx)),scale(...s));
 gl.uniformMatrix4fv(uni.M,false,new Float32Array(mat));let color=PALETTES[character]?.[n.material]||MATERIALS[n.material]||MATERIALS.skin;
 gl.uniform3fv(uni.color,new Float32Array(color));let z=zones[n.region],days=z?.days;const hot=z?.status==='hot'?1:z?.status==='warm'?.48:0,cold=z?.status==='cold'?1:0;
 let pvalue=pump? Math.min(1,pump)*.42:0;let glow= n.glow||0;let gColor=n.material==='gem'||n.material==='ice'?tint:[0,0,0];
 gl.uniform3fv(uni.glow,new Float32Array(mul(gColor,glow*.4)));gl.uniform1f(uni.metal,n.metal);gl.uniform1f(uni.fur,n.fur);
 const matType=['skin','skinLight','muzzle','nose','brown'].includes(n.material)?0:
 ['fur','furDark'].includes(n.material)?1:
 ['iron','steel','gold','goldBright','black'].includes(n.material)?2:
 ['leather'].includes(n.material)?3:
 ['horn','tip','tooth'].includes(n.material)?4:
 ['gem','ice','lava'].includes(n.material)?5:6;
 gl.uniform1f(uni.matType,matType);gl.uniform1f(uni.sculpt,n.name==='sculpt-body'?1:0);
 gl.uniform1f(uni.hot,hot*.65+pvalue);gl.uniform1f(uni.cold,cold*.8);gl.uniform1f(uni.breath,breath);
 gl.bindVertexArray(n.geometry.vao);gl.drawElements(gl.TRIANGLES,n.geometry.count,gl.UNSIGNED_SHORT,0);
 }
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);gl.useProgram(pp);gl.uniformMatrix4fv(pUni.P,false,new Float32Array(P));gl.uniformMatrix4fv(pUni.V,false,new Float32Array(Vw));gl.uniform1f(pUni.time,anim);gl.uniform3fv(pUni.tint,new Float32Array(tint));gl.uniform1f(pUni.kind,mode==='ember'?2:mode==='tide'?1:0);gl.bindVertexArray(pbuf);gl.drawArrays(gl.POINTS,0,110);gl.depthMask(true);gl.disable(gl.BLEND);
 }
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let stop=null;
 function setMode(next){mode=['storm','tide','ember'].includes(next)?next:'storm'}
 function setCharacter(next){const v=['bruiser','shell','kaiju'].includes(next)?next:'bruiser';if(v===character){canvas.dataset.character=v;return}if(!models[v])models[v]=bodyNodes(gl,lib,v);character=v;nodes=models[v];mode={bruiser:'storm',shell:'tide',kaiju:'ember'}[v];canvas.dataset.character=v;targetAngle=-.12;angle=-.12;}
 function setZones(next,ps){zones=next||{};pumps=ps||{}}
 function setGear(next){gear={...gear,...(next||{})}}
 function setAccent(next){accent=next||'default'}
 function setQuality(next){quality=next==='balanced'?'balanced':'cinematic'}
 function reset(){targetAngle=-.12;targetZoom=12.15}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf)}else if(active){raf=requestAnimationFrame(draw)}});
 raf=requestAnimationFrame(draw);
 return{setMode,setCharacter,setGear,setAccent,setZones,setQuality,reset,getRenderer:()=> webgl2?'WebGL2':'WebGL1',dispose(){active=false;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',touchDown);canvas.removeEventListener('pointermove',touchMove);canvas.removeEventListener('pointerup',touchUp);canvas.removeEventListener('pointercancel',touchUp)}}
}
root.PQ3D={create:init};
})(window);