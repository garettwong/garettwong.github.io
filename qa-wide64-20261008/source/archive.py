"""Read/repack EmulatorJS 7z core bundles using the installed libarchive."""
from pathlib import Path
import ctypes as C
L=C.CDLL('libarchive.so.13')
def api(name, ret, *args):
 f=getattr(L,name); f.restype=ret; f.argtypes=args; return f
ptr=C.c_void_p; sz=C.c_size_t; i=C.c_int; ll=C.c_int64; s=C.c_char_p
new=api('archive_read_new',ptr)
filters=api('archive_read_support_filter_all',i,ptr)
formats=api('archive_read_support_format_all',i,ptr)
openfile=api('archive_read_open_filename',i,ptr,s,sz)
nextheader=api('archive_read_next_header',i,ptr,C.POINTER(ptr))
name=api('archive_entry_pathname',s,ptr)
size=api('archive_entry_size',ll,ptr)
read=api('archive_read_data',ll,ptr,ptr,sz)
free=api('archive_read_free',i,ptr)
error=api('archive_error_string',s,ptr)
def unpack(src,dst):
 dst=Path(dst);dst.mkdir(parents=True,exist_ok=True);a=new();filters(a);formats(a)
 assert openfile(a,str(src).encode(),10240)==0,error(a)
 e=ptr(); manifest=[]
 while (n:=nextheader(a,C.byref(e)))==0:
  nm=name(e).decode();assert not nm.startswith('/') and '..' not in Path(nm).parts
  kind=api('archive_entry_filetype',C.c_uint,ptr)(e)
  if kind==0o040000: (dst/nm).mkdir(parents=True,exist_ok=True);continue
  assert kind==0o100000, 'Non-regular archive entry rejected: '+nm
  nbytes=size(e); data=C.create_string_buffer(nbytes);got=read(a,data,nbytes);assert got==nbytes
  p=dst/nm;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data.raw)
  manifest.append((nm,nbytes))
 assert n==1,error(a)
 free(a);return manifest
def pack(src,dst):
 a=api('archive_write_new',ptr)();assert api('archive_write_set_format_7zip',i,ptr)(a)==0
 assert api('archive_write_open_filename',i,ptr,s)(a,str(dst).encode())==0,error(a)
 for p in sorted(Path(src).iterdir()):
  assert p.is_file();data=p.read_bytes();e=api('archive_entry_new',ptr)()
  api('archive_entry_set_pathname',None,ptr,s)(e,p.name.encode())
  api('archive_entry_set_size',None,ptr,ll)(e,len(data))
  api('archive_entry_set_filetype',None,ptr,C.c_uint)(e,0o100000)
  api('archive_entry_set_perm',None,ptr,C.c_uint)(e,0o644)
  api('archive_entry_set_mtime',None,ptr,ll,ll)(e,0,0)
  assert api('archive_write_header',i,ptr,ptr)(a,e)==0,error(a)
  buf=C.create_string_buffer(data)
  assert api('archive_write_data',ll,ptr,ptr,sz)(a,buf,len(data))==len(data),error(a)
  api('archive_entry_free',None,ptr)(e)
 assert api('archive_write_close',i,ptr)(a)==0,error(a)
 api('archive_write_free',i,ptr)(a)
if __name__=='__main__':
 import sys,json
 print(json.dumps(unpack(*sys.argv[1:]),indent=2))
