import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseService } from '../db/index.ts';

export const privacyRoutes = (db: DatabaseService): FastifyPluginAsync => async (fastify) => {
  fastify.get<{ Params: { install_id: string } }>('/api/v1/privacy/export/:install_id', async (request, reply) => {
    const { install_id } = request.params;
    const consent = await db.consents.getById(install_id);
    if (!consent) {
      return reply.code(404).send({ error: 'No user data found for this installation' });
    }

    const allPrompts = await db.prompts.getAll(1000);
    const userPrompts = allPrompts.filter((p) => p.install_id === install_id);

    return {
      export_date: new Date().toISOString(),
      install_id,
      consent_settings: consent,
      prompts_count: userPrompts.length,
      prompts: userPrompts,
    };
  });

  fastify.delete<{ Params: { install_id: string } }>('/api/v1/privacy/delete/:install_id', async (request) => {
    const { install_id } = request.params;
    await db.purgeUserData(install_id);
    return {
      success: true,
      message: `All data associated with install ID ${install_id} has been permanently purged.`,
    };
  });
};
