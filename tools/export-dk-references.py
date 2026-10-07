"""Extract supplied-video reference frames and existing atlas cells; never edits game assets."""
from pathlib import Path
import argparse, json, math, subprocess, zipfile
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs/sprites-para-redibujar'
VIDEO = Path(r'C:\Users\Abraham\Documents\Zoom\2026-09-23 20.58.54 Reunión de Zoom de Gloria Chacón\video1712159502.mp4')
FF = Path(r'C:\Users\Abraham\Documents\Codex\2026-09-23\files-pasted-by-the-user-we\work\video-tools\org\bytedeco\ffmpeg\windows-x86_64\ffmpeg.exe')
FONT = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)
SMALL = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 12)
NN = Image.Resampling.NEAREST

def board(items, path, cols=6, cell=(192,172), title=''):
    w,h=cell
    im=Image.new('RGB',(w*cols,math.ceil(len(items)/cols)*h+34),'#172129')
    d=ImageDraw.Draw(im); d.text((10,8),title,font=FONT,fill='white')
    for i,(src,label) in enumerate(items):
        x,y=i%cols*w,34+i//cols*h
        tile=src.copy(); tile.thumbnail((w-8,h-26),NN)
        if tile.mode=='RGBA':
            bg=Image.new('RGBA',tile.size,'#c9b4a5'); bg.alpha_composite(tile); tile=bg.convert('RGB')
        im.paste(tile,(x+(w-tile.width)//2,y+24))
        d.text((x+5,y+4),label,font=SMALL,fill='white')
    path.parent.mkdir(parents=True,exist_ok=True); im.save(path)

def current():
    dest=OUT/'01-sprites-actuales'; (dest/'png-32x32').mkdir(parents=True,exist_ok=True)
    atlas=Image.open(ROOT/'public/assets/jungle-atlas.png').convert('RGBA')
    data=json.loads((ROOT/'public/assets/jungle-atlas.json').read_text())
    items=[]
    for name,info in data['frames'].items():
        if not name.startswith('dk-'): continue
        f=info['frame']; im=atlas.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
        im.save(dest/'png-32x32'/f'{name}.png'); items.append((im.resize((128,128),NN),name))
    items.sort(key=lambda p:p[1]); board(items,dest/'TODAS-LAS-POSES.png',cols=6,cell=(192,164),title='28 poses actuales - 4x - PNG individuales transparentes en png-32x32')
    print(f'Exported {len(items)} current poses',flush=True)

def overview():
    dest=OUT/'03-indice-del-video'; (dest/'fotogramas').mkdir(parents=True,exist_ok=True)
    subprocess.run([str(FF),'-hide_banner','-loglevel','error','-y','-i',str(VIDEO),'-vf','fps=1,crop=854:768:256:0,scale=160:144:flags=neighbor',str(dest/'fotogramas'/'%04d.png')],check=True)
    frames=sorted((dest/'fotogramas').glob('*.png'))
    for start in range(0,len(frames),42):
        items=[(Image.open(p),f'{i//60:02}:{i%60:02} ({i}s)') for i,p in enumerate(frames[start:start+42],start)]
        board(items,dest/f'indice-{start:03d}-{min(start+41,len(frames)-1):03d}.png',cols=7,cell=(168,170),title='Indice de busqueda - 1 captura/s - tiempo aproximado (muestreo fps)')
    print(f'Overview: {len(frames)} frames',flush=True)

SEGMENTS = [
    ('01-caminar-y-rodar',67.36,1.12,(8,40,110,144),'Caminar y vuelta; no separar caminar/correr sin confirmar'),
    ('02-salto-subida-bajada',75.4,1.6,(32,0,110,112),'Salto desde casa hacia palma'),
    ('03-quieto-y-borde',77.0,3.4,(20,0,155,138),'Apoyo en palma y borde; incluye movimientos intermedios'),
    ('04-cargar-jungle',81.0,2.3,(20,0,125,144),'Barril sobre la cabeza; hojas pueden tapar partes'),
    ('05-cargar-lanzar-cueva',304.4,3.8,(20,0,135,144),'Carga, salto con barril y lanzamiento; conservar contexto'),
    ('06-frontal-manos-cabeza',133.2,4.0,(112,82,160,144),'Pose frontal en bonus; NO confirmada como muerte'),
    ('07-frontal-secuencia-larga',247.2,5.4,(20,0,130,144),'Segunda pose frontal en bonus; NO confirmada como muerte'),
    ('08-cuerda-balanceo',197.0,2.4,(24,0,120,110),'Referencia futura de cuerda, no implementada'),
    ('09-cuerda-vertical',217.4,2.6,(32,0,110,138),'Referencia futura de trepar, no implementada'),
    ('10-agacharse-desplazamiento-bajo',393.6,2.0,(20,0,135,144),'Paso bajo techo de cueva; acción futura'),
    ('11-salida-frontal',413.8,1.6,(25,0,150,144),'Salida; inspeccionar antes de llamarlo festejo'),
    ('12-desplazamiento-suelo',72.5,1.2,(45,50,160,144),'Otra muestra de locomoción; carrera no confirmada'),
    ('13-contacto-enemigo-por-verificar',343.4,2.0,(0,0,160,144),'Revision descartada para DK: aparece Diddy; NO referencia de muerte de DK'),
]

def sequences():
    for name,start,duration,box,note in SEGMENTS:
        dest=OUT/'02-video-referencia'/name
        for folder in ['pantalla-160-aprox','recortes-originales','recortes-4x']:
            (dest/folder).mkdir(parents=True,exist_ok=True)
        raw=subprocess.run([str(FF),'-hide_banner','-loglevel','error','-ss',str(start),'-i',str(VIDEO),'-t',str(duration),'-vf','crop=854:768:256:0','-an','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],capture_output=True,check=True).stdout
        count=len(raw)//(854*768*3); items=[]
        for i in range(count):
            im=Image.frombytes('RGB',(854,768),raw[i*854*768*3:(i+1)*854*768*3])
            stamp=start+i/25; label=f'{int(stamp)//60:02}-{stamp%60:05.2f}'
            small=im.resize((160,144),NN); small.save(dest/'pantalla-160-aprox'/f'{i:03d}_{label}.png')
            # Uniform context crop, not an automatic background cutout or a sprite sheet ripped from ROM.
            x0,y0,x1,y1=box; crop=im.crop((round(x0*854/160),round(y0*768/144),round(x1*854/160),round(y1*768/144)))
            crop.save(dest/'recortes-originales'/f'{i:03d}_{label}.png')
            preview=small.crop(box).resize(((x1-x0)*4,(y1-y0)*4),NN)
            preview.save(dest/'recortes-4x'/f'{i:03d}_{label}.png')
            items.append((preview,f'{i:03d} | {stamp:.2f}s'))
        # Every recorded frame, paginated; duplicates intentionally retained.
        for k in range(0,count,30):
            board(items[k:k+30],dest/f'LAMINA-{k//30+1:02d}.png',cols=6,cell=(224,238),title=f'{name} | {note}')
        board([(Image.open(p),p.stem) for p in sorted((dest/'pantalla-160-aprox').glob('*.png'))[::5]],dest/'CONTEXTO.png',cols=6,cell=(176,170),title=f'{name} | contexto cada 0.20s')
        print(f'{name}: {count} frames at 25fps',flush=True)

def selection():
    # Hand-selected contexts, not invented poses. Boxes are in approximate 160x144 coordinates.
    picks = [
        ('01-caminar',0,[(i,(34,78,92,136)) for i in [0,2,4,6,8,10,12]]),
        ('02-rodar',0,[(i,b) for i,b in [(14,(32,78,92,136)),(16,(32,78,92,136)),(18,(20,78,80,136)),(20,(10,78,70,136)),(22,(8,65,70,132))]]),
        ('03-saltar',1,[(5,(40,0,100,58)),(15,(40,0,100,64)),(20,(32,35,105,102)),(25,(44,26,110,90))]),
        ('04-quieto-y-gestos-en-palma',2,[(i,(68,35,137,102)) for i in [10,15,20,25,30,35,40,45]]),
        ('05-barril-cargar-lanzar',4,[(i,(30,16,98,100)) for i in [5,10,15,20,25]]+[(i,(30,32,104,136)) for i in [45,50,55,60,65,70,75,80,85]]),
        ('06-frontal-manos-cabeza-NO-MUERTE-confirmada',6,[(i,(48,93,105,144)) for i in [15,25,40,50,55,60,65,75,85,95,100,110,120,130]]),
        ('07-cuerda-balanceo-FUTURO',7,[(i,(24,0,102,75)) for i in [40,45,50,55]]),
        ('08-cuerda-vertical-FUTURO',8,[(i,(32,0,110,138)) for i in [15,20,25,30,35,50,60]]),
        ('09-agacharse-FUTURO',9,[(i,(32,45,108,115)) for i in [15,20,25,30,35,40,45]]),
        ('10-salida-frontal',10,[(i,(45,85,130,144)) for i in [25,30,35]]),
    ]
    index=[]
    for group,segment,frames in picks:
        name,start,_,source_box,_=SEGMENTS[segment]
        src=OUT/'02-video-referencia'/name
        dest=OUT/'00-SELECCION-PARA-DIBUJAR'/group
        (dest/'png-video').mkdir(parents=True,exist_ok=True)
        (dest/'png-4x-aprox').mkdir(parents=True,exist_ok=True)
        items=[]
        for frame,box in frames:
            p=next((src/'pantalla-160-aprox').glob(f'{frame:03d}_*.png'))
            small=Image.open(p).crop(box)
            preview=small.resize((small.width*4,small.height*4),NN)
            preview.save(dest/'png-4x-aprox'/p.name)
            # Crop source pixels from the previously exported larger context, no generated fill.
            native=Image.open(src/'recortes-originales'/p.name)
            ox,oy=round(source_box[0]*854/160),round(source_box[1]*768/144)
            b=(round(box[0]*854/160)-ox,round(box[1]*768/144)-oy,
               round(box[2]*854/160)-ox,round(box[3]*768/144)-oy)
            assert b[0]>=0 and b[1]>=0 and b[2]<=native.width and b[3]<=native.height,(group,b,native.size)
            native.crop(b).save(dest/'png-video'/p.name)
            items.append((preview,f'{start+frame/25:.2f}s | frame {frame:03}'))
        board(items,dest/'LAMINA.png',cols=5,cell=(296,310),title=group+' | PNG con fondo del video, NO sprites originales extraidos del juego')
        index.append((items[0][0],group))
    board(index,OUT/'00-SELECCION-PARA-DIBUJAR'/'INDICE.png',cols=2,cell=(440,340),title='Referencia seleccionada: cada carpeta contiene la secuencia ampliada y PNG individuales')
    print('Selected reference sheets ready',flush=True)

def package():
    frames=json.loads((ROOT/'public/assets/jungle-atlas.json').read_text())['frames']
    atlas=Image.open(ROOT/'public/assets/jungle-atlas.png').convert('RGBA')
    expected={n for n in frames if n.startswith('dk-')}
    actual=list((OUT/'01-sprites-actuales'/'png-32x32').glob('*.png'))
    assert {p.stem for p in actual}==expected and len(actual)==28
    for p in actual:
        im=Image.open(p); f=frames[p.stem]['frame']
        assert im.mode=='RGBA' and im.size==(32,32)
        assert im.tobytes()==atlas.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).tobytes()
    for p in OUT.rglob('*.png'):
        with Image.open(p) as im: im.verify()
    files=[OUT/'LEEME.md']
    for folder in ['00-SELECCION-PARA-DIBUJAR','01-sprites-actuales']:
        files.extend(sorted(p for p in (OUT/folder).rglob('*') if p.is_file()))
    dest=OUT/'DK-PARA-DIBUJAR.zip'
    with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
        for p in files: z.write(p,p.relative_to(OUT))
    with zipfile.ZipFile(dest) as z: assert z.testzip() is None
    print(f'Validated 28 exact atlas cells; all PNG readable. ZIP: {len(files)} files, {dest.stat().st_size/1024/1024:.1f} MiB',flush=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('command',choices=['current','overview','sequences','selection','package']); args=ap.parse_args()
    globals()[args.command]()
