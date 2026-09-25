"""从 Millennium .star 插件包中提取前端 bundle.js（按 Millennium 源码 star_parser 的算法）。"""
import struct
import sys


def xor_decode(s: bytes) -> bytes:
    return bytes((b ^ 0x4D ^ (i & 0xFF)) for i, b in enumerate(s))


def strip_parity(w: bytes) -> bytes:
    out = bytearray()
    pos = 0
    while pos < len(w):
        end = min(pos + 64, len(w) - 12)
        out += w[pos:end]
        pos = end + 12
    return bytes(out)


def star_decompress(src: bytes) -> bytes:
    orig = struct.unpack_from('<I', src, 0)[0]
    out = bytearray()
    ip = 4
    while ip < len(src):
        token = src[ip]
        ip += 1
        lit = token >> 4
        if lit == 15:
            while True:
                b = src[ip]
                ip += 1
                lit += b
                if b != 255:
                    break
        out += src[ip:ip + lit]
        ip += lit
        if ip >= len(src):
            break
        off = src[ip] | (src[ip + 1] << 8)
        ip += 2
        ml = (token & 0xF) + 4
        if (token & 0xF) == 15:
            while True:
                b = src[ip]
                ip += 1
                ml += b
                if b != 255:
                    break
        start = len(out) - off
        for i in range(ml):
            out.append(out[start + i])
    assert len(out) == orig, (len(out), orig)
    return bytes(out)


def extract(star_path: str, out_path: str) -> None:
    data = open(star_path, 'rb').read()
    shim_len = struct.unpack_from('<I', data, 0)[0]
    star = 4 + shim_len
    assert data[star:star + 4] == b'STAR', 'bad magic'
    sec_count = data[star + 6]
    for i in range(sec_count):
        e = star + 12 + i * 256
        sid, enc = data[e], data[e + 1]
        off, ln = struct.unpack_from('<QQ', data, e + 8)
        raw = data[star + off:star + off + ln]
        d = xor_decode(raw) if enc & 0x40 else raw
        d = strip_parity(d)
        if enc & 0x80:
            d = star_decompress(d)
        if sid != 3:  # frontend
            continue
        count = struct.unpack_from('<I', d, 0)[0]
        pos = 4
        for _ in range(count):
            nl, dl = struct.unpack_from('<HI', d, pos)
            pos += 6
            name = d[pos:pos + nl].decode()
            pos += nl
            blob = d[pos:pos + dl]
            pos += dl
            if name == 'bundle.js':
                open(out_path, 'wb').write(blob)
                print('extracted', name, dl, '->', out_path)
                return
    raise RuntimeError('frontend bundle.js not found')


if __name__ == '__main__':
    extract(sys.argv[1], sys.argv[2])
