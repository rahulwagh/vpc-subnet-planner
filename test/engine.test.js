'use strict';
// Behavioural tests for the planner engine. Run: node --test test/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const load = require('./extract-engine');

const HTML = path.join(__dirname, '..', 'index.html');
const base = { cloud: 'aws', addr: '10.0.0.0', pfx: 16, az: 3, futureAz: false, contig: true, growth: 50, existing: '', routing: true };
const fresh = (over = {}) => load(HTML).configure({ ...base, preset: 'Three tier (web, app, data)', ...over });
const sz = p => 2 ** (32 - p);
// values come out of a separate vm realm, so compare by value rather than by prototype
const same = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

test('ip helpers round-trip and reject bad input', () => {
  const e = fresh();
  assert.equal(e.n2ip(e.ip2n('10.1.2.3')), '10.1.2.3');
  assert.equal(e.ip2n('10.1.2'), null);
  assert.equal(e.ip2n('10.1.2.256'), null);
  assert.equal(e.parseCidr('10.0.0.0/33'), null);
  same(e.parseCidr('10.0.5.0/16'), { base: e.ip2n('10.0.0.0'), prefix: 16, raw: e.ip2n('10.0.5.0') });
});

test('hostsToPrefix adds growth headroom and the reserved addresses', () => {
  const e = fresh();
  assert.equal(e.hostsToPrefix(50, 5, 0), 26);    // 50+5 = 55  -> /26 (64)
  assert.equal(e.hostsToPrefix(50, 5, 50), 25);   // 75+5 = 80  -> /25 (128)
  assert.equal(e.hostsToPrefix(251, 5, 0), 24);   // exactly a /24
  assert.equal(e.hostsToPrefix(252, 5, 0), 23);   // one more host tips it over
  assert.equal(e.hostsToPrefix(800, 5, 50), 21);  // 1200+5 -> /21 (2048)
});

test('every preset packs without overlap, on aligned boundaries, inside the network', () => {
  const e = fresh();
  for (const preset of Object.keys(e.PRESETS)) {
    e.configure({ ...base, preset });
    const R = e.run();
    assert.equal(R.errors.length, 0, preset + ' should fit in a /16');
    const subs = R.subnets;
    for (const s of subs) {
      assert.equal(s.base % sz(s.prefix), 0, `${preset}: ${s.cidr} is not aligned`);
      assert.ok(s.base >= R.vpc.base && s.base + sz(s.prefix) <= R.vpc.base + sz(R.vpc.prefix), `${preset}: ${s.cidr} outside the VPC`);
    }
    for (let i = 0; i < subs.length; i++) for (let j = i + 1; j < subs.length; j++)
      assert.equal(e.overlaps(subs[i], subs[j]), false, `${preset}: ${subs[i].cidr} overlaps ${subs[j].cidr}`);
    const used = subs.reduce((a, s) => a + s.total, 0);
    const free = R.free.reduce((a, f) => a + sz(f.prefix), 0);
    const pad = R.pad.reduce((a, f) => a + sz(f.prefix), 0);
    assert.equal(used + pad + free, sz(16), preset + ': subnets + alignment padding + free must equal the whole network');
    assert.equal(R.used + free, sz(16), preset + ': tier blocks + free must equal the whole network');
  }
});

test('three zones in contiguous mode leave one padding slot per tier, and a reserved 4th zone uses it', () => {
  let R = fresh().run();
  same(R.pad.map(p => `${p.tier.n} ${e2(p)}`), ['private 10.0.48.0/20', 'public 10.0.67.0/24', 'database 10.0.71.0/24']);
  assert.ok(R.review.items.some(i => i.k === 'warn' && /alignment padding/.test(i.t)));
  R = fresh({ futureAz: true }).run();
  assert.equal(R.pad.length, 0);
  R = fresh({ az: 4 }).run();
  assert.equal(R.pad.length, 0, 'four zones fill the power-of-two block exactly');
  R = fresh({ az: 5 }).run();
  assert.equal(R.pad.length, 9, 'five zones round up to eight slots: three padding slots per tier');
  function e2(p) { return fresh().cidrStr(p.base, p.prefix); }
});

test('non-contiguous mode packs every subnet largest-first with no padding at all', () => {
  const R = fresh({ contig: false }).run();
  assert.equal(R.pad.length, 0);
  assert.equal(R.blocks.length, 0);
  const used = R.subnets.reduce((a, s) => a + s.total, 0);
  const free = R.free.reduce((a, f) => a + sz(f.prefix), 0);
  assert.equal(used + free, sz(16));
  for (let i = 1; i < R.subnets.length; i++) assert.ok(R.subnets[i].base >= R.subnets[i - 1].base + R.subnets[i - 1].total, 'sorted and non-overlapping');
});

test('contiguous mode keeps each tier inside one summary block', () => {
  const e = fresh();
  const R = e.run();
  for (const b of R.blocks) {
    const mine = R.subnets.filter(s => s.tier.n === b.tier.n);
    for (const s of mine) assert.ok(s.base >= b.base && s.base + s.total <= b.base + sz(b.prefix), `${s.cidr} outside block ${e.cidrStr(b.base, b.prefix)}`);
  }
  // three /20 private subnets live in one /18 (3 zones round up to 4 slots)
  const priv = R.blocks.find(b => b.tier.n === 'private');
  assert.equal(priv.prefix, 18);
});

test('reserving a future zone adds a 4th slot but no 4th live subnet', () => {
  const e = fresh({ futureAz: true });
  const R = e.run();
  assert.equal(R.subnets.filter(s => !s.future).length, 9);
  assert.equal(R.subnets.filter(s => s.future).length, 3);
  assert.equal(R.subnets.find(s => s.future && s.tier.n === 'public').cidr, '10.0.67.0/24');
});

test('reserved addresses follow each cloud', () => {
  // cloud -> [reserved per subnet, smallest allowed prefix, usable hosts in that smallest subnet]
  const want = { aws: [5, 28, 11], azure: [5, 29, 3], gcp: [4, 29, 4], generic: [2, 30, 2] };
  for (const [cloud, [reserved, minPrefix, usable]] of Object.entries(want)) {
    const e = fresh({ cloud, az: 1 });
    assert.equal(e.CLOUDS[cloud].minPrefix, minPrefix, cloud + ' smallest subnet');
    e.S.tiers = [{ n: 't', r: 'private', m: 'prefix', v: minPrefix }];
    const s = e.run().subnets[0];
    assert.equal(s.reserved.length, reserved, cloud);
    assert.equal(s.usable, usable, `${cloud} usable in a /${minPrefix}`);
  }
  const aws = fresh().run().subnets.find(s => s.tier.n === 'public');
  assert.equal(aws.usable, 251, 'AWS /24 has 251 usable addresses');
  same(aws.reserved.slice(1, 4).map(r => r[1]), ['VPC router', 'Amazon DNS (Route 53 Resolver)', 'reserved for future use']);
});

test('a mistyped network address is snapped to its boundary and flagged', () => {
  const e = fresh({ addr: '10.0.5.0' });
  const R = e.run();
  assert.equal(e.cidrStr(R.vpc.base, R.vpc.prefix), '10.0.0.0/16');
  assert.ok(R.vpc.misaligned);
  assert.ok(R.review.items.some(i => i.k === 'warn' && /not on a \/16 boundary/.test(i.t)));
});

test('public ranges and illegal AWS sizes fail the review', () => {
  let R = fresh({ addr: '11.0.0.0' }).run();
  assert.ok(R.review.items.some(i => i.k === 'bad' && /Public address space/.test(i.t)));
  R = fresh({ addr: '10.0.0.0', pfx: 12 }).run();
  assert.ok(R.review.items.some(i => i.k === 'bad' && /\/16 to \/28/.test(i.t)));
  const e = fresh();
  e.S.tiers = [{ n: 'public', r: 'public', m: 'prefix', v: 28 }];
  R = e.run();
  assert.ok(R.review.items.some(i => i.k === 'bad' && /Application Load Balancer/.test(i.t)));
});

test('overlap with an existing network is detected and free alternatives are suggested', () => {
  const e = fresh({ existing: '10.0.0.0/8 corporate\n192.168.0.0/16 home lab' });
  const R = e.run();
  assert.equal(R.existing.filter(x => x.hit).length, 1);
  assert.ok(R.review.items.some(i => i.k === 'bad' && /Overlaps 1 existing network/.test(i.t)));
  same(R.suggest, ['172.16.0.0/16', '172.17.0.0/16', '172.18.0.0/16', '172.19.0.0/16']);
});

test('a plan that cannot fit reports which tier failed instead of silently truncating', () => {
  const e = fresh({ pfx: 22 });
  const R = e.run();
  // a /20 tier cannot be bigger than its /22 network, so it is clamped to /22 and its 4-slot block becomes a /20
  assert.ok(R.errors.some(m => /private: a \/20 block does not fit in 10.0.0.0\/22/.test(m)), R.errors.join(' | '));
  assert.ok(R.errors.some(m => /database: a \/22 block does not fit/.test(m)), R.errors.join(' | '));
  // the public /24 tier still fits, so it is placed; the two that do not fit are reported, not dropped silently
  same([...new Set(R.subnets.map(s => s.tier.n))], ['public']);
  assert.equal(R.errors.length, 2);
});

test('free space is reported as aligned CIDR blocks', () => {
  const e = fresh();
  same(e.splitFree(e.ip2n('10.0.72.0'), e.ip2n('10.1.0.0')).map(f => e.cidrStr(f.base, f.prefix)),
    ['10.0.72.0/21', '10.0.80.0/20', '10.0.96.0/19', '10.0.128.0/17']);
});

test('Terraform export derives every subnet with cidrsubnet() that reproduces the planned CIDR', () => {
  const e = fresh({ futureAz: true });
  const R = e.run();
  const tf = e.tfAws(R);
  const re = /"([\w-]+)"\s*= \{ cidr = cidrsubnet\(local\.vpc_cidr, (\d+), (\d+)\).*# (\S+)/g;
  let m, n = 0;
  while ((m = re.exec(tf))) {
    n++;
    const [, name, newbits, netnum, cidr] = m;
    const p = R.vpc.prefix + Number(newbits);
    const addr = R.vpc.base + Number(netnum) * sz(p);
    assert.equal(e.cidrStr(addr, p), cidr, name);
    assert.equal(R.subnets.find(s => s.name === name).cidr, cidr, name);
  }
  assert.equal(n, 9, 'future-zone subnets are listed as free space, not as resources');
  assert.match(tf, /resource "aws_nat_gateway" "this"/);
  assert.match(tf, /aws_vpc_endpoint" "s3"/);
});

test('the other exporters cover every subnet', () => {
  const e = fresh();
  const R = e.run();
  assert.equal(JSON.parse(e.json(R)).subnets.length, 9);
  assert.equal(e.csv(R).trim().split('\n').length, 10);
  assert.equal((e.cfnAws(R).match(/Type: AWS::EC2::Subnet$/gm) || []).length, 9);
  e.configure({ ...base, cloud: 'azure', preset: 'Three tier (web, app, data)' });
  assert.equal((e.azureCli(e.run()).match(/az network vnet subnet create/g) || []).length, 3, 'Azure subnets are not zonal');
  e.configure({ ...base, cloud: 'gcp', preset: 'Three tier (web, app, data)' });
  assert.equal((e.gcloud(e.run()).match(/gcloud compute networks subnets create/g) || []).length, 3);
});
