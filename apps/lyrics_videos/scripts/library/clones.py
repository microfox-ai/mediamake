"""APFS clone id of each file, for media dedupe: files with the same id are clones that already share
their bytes (getattrlist ATTR_CMNEXT_CLONEID). Paths on stdin, one a line; prints "<id>\t<path>",
or "-\t<path>" when the disk can't tell (not APFS, gone)."""
import ctypes
import ctypes.util
import struct
import sys

libc = ctypes.CDLL(ctypes.util.find_library("c"), use_errno=True)


class AttrList(ctypes.Structure):
    _fields_ = [
        ("bitmapcount", ctypes.c_ushort),
        ("reserved", ctypes.c_uint16),
        ("commonattr", ctypes.c_uint32),
        ("volattr", ctypes.c_uint32),
        ("dirattr", ctypes.c_uint32),
        ("fileattr", ctypes.c_uint32),
        ("forkattr", ctypes.c_uint32),  # the extended common attributes go here with FSOPT_ATTR_CMN_EXTENDED
    ]


ATTR_CMNEXT_CLONEID = 0x100
FSOPT_NOFOLLOW = 0x1
FSOPT_ATTR_CMN_EXTENDED = 0x20

for line in sys.stdin:
    path = line.rstrip("\n")
    if not path:
        continue
    attrs = AttrList(5, 0, 0, 0, 0, 0, ATTR_CMNEXT_CLONEID)
    buf = ctypes.create_string_buffer(32)
    ok = libc.getattrlist(path.encode(), ctypes.byref(attrs), buf, len(buf), FSOPT_NOFOLLOW | FSOPT_ATTR_CMN_EXTENDED) == 0
    clone_id = struct.unpack_from("<IQ", buf.raw)[1] if ok else 0
    print(f"{clone_id or '-'}\t{path}")
