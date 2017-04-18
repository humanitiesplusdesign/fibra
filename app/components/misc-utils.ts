namespace fibra {
  'use strict'
  export function toTurtle(prefixes: {}, m: d3.Map<string>): string {
    let s: string = ''
    for (let key in prefixes) s = s + '@prefix ' + key + ': <' + prefixes[key] + '> .\n'
    m.values().forEach(str => s = s + str.substring(0, str.length - 2) + ' .\n\n')
    return s
  }

  export function citableToTurtle(c: ICitable): string {
    let prefixes: {} = {}
    let m: d3.Map<string> = new Map<string>()
    c.toTurtle(m, prefixes)
    return toTurtle(prefixes, m)
  }

  let lut: string[] = []
  for (let i: number = 0; i < 256; i++)
    lut[i] = (i < 16 ? '0' : '') + i.toString(16)

  export function UUID(): string {
    /* tslint:disable:no-bitwise */
    let d0: number = Math.random() * 0xffffffff | 0
    let d1: number = Math.random() * 0xffffffff | 0
    let d2: number = Math.random() * 0xffffffff | 0
    let d3: number = Math.random() * 0xffffffff | 0
    return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
      lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
      lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
      lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff]
    /* tslint:enable:no-bitwise */
  }


}