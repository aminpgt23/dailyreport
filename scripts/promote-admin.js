const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'src', 'generated', 'prisma'));
const p = new PrismaClient();
p.user.update({ where: { nip: 'admin' }, data: { role: 'superadmin' } })
  .then(() => p.user.findUnique({ where: { nip: 'admin' } }))
  .then((u) => { console.log('Done:', u.nip, 'role:', u.role); p.$disconnect(); });
