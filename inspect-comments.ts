import { sequelize } from './src/models/sequelize';
import { Comment } from './src/models';

async function run() {
  await sequelize.authenticate();
  const comments = await Comment.findAll({ where: { postId: 163 }, raw: true });
  console.log(comments.map(c => ({ id: c.id, parentId: c.parentId, content: c.content })));
  process.exit(0);
}
run().catch(console.error);
