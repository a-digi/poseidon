export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string) => {
    const stripped = v.trim().replace(/^[vV]/, '');
    const dashIdx = stripped.indexOf('-');
    const core = dashIdx === -1 ? stripped : stripped.slice(0, dashIdx);
    const pre = dashIdx === -1 ? '' : stripped.slice(dashIdx + 1);
    const segments = core.split('.').map((s) => {
      const n = parseInt(s, 10);
      return isNaN(n) ? 0 : n;
    });
    return { segments, pre };
  };

  const pa = parse(a);
  const pb = parse(b);

  const len = Math.max(pa.segments.length, pb.segments.length);
  for (let i = 0; i < len; i++) {
    const sa = pa.segments[i] ?? 0;
    const sb = pb.segments[i] ?? 0;
    if (sa !== sb) return sa < sb ? -1 : 1;
  }

  const aPre = pa.pre !== '';
  const bPre = pb.pre !== '';

  if (!aPre && bPre) return 1;
  if (aPre && !bPre) return -1;
  if (!aPre && !bPre) return 0;

  const aSegs = pa.pre.split('.');
  const bSegs = pb.pre.split('.');
  const preLen = Math.max(aSegs.length, bSegs.length);

  for (let i = 0; i < preLen; i++) {
    const as = aSegs[i] ?? '';
    const bs = bSegs[i] ?? '';
    const an = parseInt(as, 10);
    const bn = parseInt(bs, 10);
    const aNum = !isNaN(an);
    const bNum = !isNaN(bn);

    if (aNum && bNum) {
      if (an !== bn) return an < bn ? -1 : 1;
    } else {
      const cmp = as.localeCompare(bs);
      if (cmp !== 0) return cmp < 0 ? -1 : 1;
    }
  }

  return 0;
}
