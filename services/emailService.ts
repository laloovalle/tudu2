
import { Task, User, TaskPriority, TaskStatus } from '../types';
import { sendRawEmail } from './apiService';

// Actual URL provided by user
const APP_LINK = "https://tud-eo-51872819966.us-west1.run.app/";

export const sendEmailNotification = async (
  task: Partial<Task>, 
  recipients: User[], 
  type: 'create' | 'status_change' | 'note_added' | 'assigned' | 'priority_change',
  adminEmail?: string,
  extraData?: { noteContent?: string, authorName?: string, oldPriority?: TaskPriority, newPriority?: TaskPriority },
  actorEmail?: string
) => {
  console.log(`📧 Preparando envío de email. Tipo: ${type}. Actor: ${actorEmail || 'N/A'}`);

  // 1. Normalizar emails para comparaciones consistentes
  const normalizedAdminEmail = adminEmail?.toLowerCase().trim();
  const normalizedActorEmail = actorEmail?.toLowerCase().trim();

  // 2. Consolidar destinatarios únicos y filtrar al "Actor" (quien hace la acción no necesita notificarse a sí mismo)
  const uniqueRecipients = Array.from(
    new Map(
      recipients
        .filter(u => u && typeof u.email === 'string' && u.email.trim() !== '')
        .map(user => [user.email.toLowerCase().trim(), user])
    ).values()
  ).filter(u => u.email.toLowerCase().trim() !== normalizedActorEmail);

  // 3. Determinar si necesitamos enviar la copia de administrador
  // Solo se envía copia si:
  // - Existe un email de admin definido.
  // - El admin NO es quien está realizando la acción (Actor).
  // - El admin NO está ya en la lista de destinatarios únicos (Responsables/Colaboradores).
  const shouldSendAdminCopy = 
    normalizedAdminEmail && 
    normalizedAdminEmail !== normalizedActorEmail && 
    !uniqueRecipients.some(u => u.email.toLowerCase().trim() === normalizedAdminEmail);

  const status = task.statusTime?.status || TaskStatus.PENDING;
  const priority = task.classification?.priority;
  const estimatedHours = task.statusTime?.estimatedHours || 0;
  const usedHours = task.statusTime?.usedHours || 0;
  const responsibleName = task.people?.responsible || 'Sin asignar';
  const creatorName = task.people?.creator || 'Sistema';
  const clientName = task.classification?.client || 'General';
  const description = task.description || 'Sin descripción';
  const title = task.title || 'Sin Título';

  const getPriorityInfo = (p?: TaskPriority) => {
      if (p === TaskPriority.CRITICAL) return { label: 'CRÍTICA', color: '#dc2626' };
      if (p === TaskPriority.HIGH) return { label: 'Alta', color: '#f97316' };
      if (p === TaskPriority.LOW) return { label: 'Baja', color: '#10b981' };
      if (p === TaskPriority.NONE) return { label: 'Nula', color: '#94a3b8' };
      return { label: 'Normal', color: '#3b82f6' };
  };

  const currentPriorityInfo = getPriorityInfo(priority);

  const generateGenericTable = (showUsedHours: boolean = false) => `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; color: #334155; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <tr style="background-color: #f8fafc;">
            <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 40%;"><strong>Cliente:</strong></td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${clientName}</td>
        </tr>
        <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Prioridad:</strong></td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                <span style="color: ${currentPriorityInfo.color}; font-weight: bold;">${currentPriorityInfo.label}</span>
            </td>
        </tr>
        <tr style="background-color: #f8fafc;">
            <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Tiempo Estimado:</strong></td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; text-align: right;">${estimatedHours} hs</td>
        </tr>
        ${showUsedHours ? `
        <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: bold;"><strong>Tiempo Real Invertido:</strong></td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 900; color: #059669; font-size: 16px;">${usedHours} hs</td>
        </tr>
        ` : ''}
        <tr style="${showUsedHours ? 'background-color: #f8fafc;' : ''}">
            <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Responsable:</strong></td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; text-align: right;">${responsibleName}</td>
        </tr>
    </table>
  `;

  let subject = '';
  let bodyContent = '';

  if (type === 'create') {
    subject = `Nueva Tarea: ${title}`;
    bodyContent = `
        <div style="margin-bottom: 20px;">
            <p style="font-size: 14px; color: #64748b; text-transform: uppercase; font-weight: 800; margin: 0 0 10px 0; letter-spacing: 1px;">
                NUEVA TAREA
            </p>
            <h1 style="font-size: 24px; line-height: 1.3; color: #1e293b; margin: 0 0 15px 0; font-weight: 900;">
                ${title}
            </h1>
            <div style="font-size: 15px; color: #475569; line-height: 1.6; font-style: italic; margin-bottom: 25px;">
                "${description}"
            </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <tr style="background-color: #f8fafc;">
                <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 35%;"><strong>Para:</strong></td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">${responsibleName}</td>
            </tr>
            <tr>
                <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Creado por:</strong></td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: right;">${creatorName}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
                <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Cliente:</strong></td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: right;">${clientName}</td>
            </tr>
            <tr>
                <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Prioridad:</strong></td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                     <span style="color: ${currentPriorityInfo.color}; font-weight: bold;">${currentPriorityInfo.label}</span>
                </td>
            </tr>
            <tr style="background-color: #f8fafc;">
                <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Tiempo Estimado:</strong></td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: right;">${estimatedHours} hs</td>
            </tr>
        </table>
    `;
  } else if (type === 'note_added' && extraData) {
    subject = `Nuevo Comentario: ${title}`;
    bodyContent = `
        <div style="margin-bottom: 20px;">
            <p style="font-size: 14px; color: #64748b; text-transform: uppercase; font-weight: 800; margin: 0 0 10px 0; letter-spacing: 1px;">
                NUEVO COMENTARIO
            </p>
            <h1 style="font-size: 20px; line-height: 1.3; color: #1e293b; margin: 0 0 15px 0; font-weight: 900;">
                ${title}
            </h1>
            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: bold; color: #334155; font-size: 14px;">
                        ${extraData.authorName} escribió:
                    </span>
                </div>
                <p style="margin: 0; font-size: 15px; color: #0f172a; line-height: 1.6; white-space: pre-wrap; font-style: italic;">
                    "${extraData.noteContent}"
                </p>
            </div>
        </div>
        ${generateGenericTable()}
    `;
  } else if (type === 'assigned') {
    subject = `Cambio de Responsable: ${title}`;
    bodyContent = `
        <div style="text-align: center; margin-bottom: 10px;">
            <span style="font-size: 40px;">👉</span>
        </div>
        <h1 style="font-size: 22px; color: #1e293b; margin: 0 0 20px 0; text-align: center; font-weight: 800;">
            "${title}"
        </h1>
        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
            <p style="color: #0369a1; margin: 0; font-size: 14px;">
                El nuevo responsable es <strong>${responsibleName}</strong>.
            </p>
        </div>
        ${generateGenericTable()}
    `;
  } else if (type === 'priority_change' && extraData) {
    const oldInfo = getPriorityInfo(extraData.oldPriority);
    subject = `Cambio de Prioridad: ${title}`;
    bodyContent = `
        <div style="text-align: center; margin-bottom: 10px;">
            <span style="font-size: 40px;">🔥</span>
        </div>
        <h1 style="font-size: 22px; color: #1e293b; margin: 0 0 20px 0; text-align: center; font-weight: 800;">
            "${title}"
        </h1>
        <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
             <p style="color: #c2410c; margin: 0; font-size: 14px;">
                La prioridad cambió de <strong>${oldInfo.label}</strong> a <strong style="color:${currentPriorityInfo.color}">${currentPriorityInfo.label}</strong>.
            </p>
        </div>
        ${generateGenericTable()}
    `;
  } else {
    switch (status) {
        case TaskStatus.IN_PROGRESS:
            subject = `En Curso: ${title}`;
            bodyContent = `
                <div style="text-align: center; margin-bottom: 10px;">
                    <span style="font-size: 40px;">🚀</span>
                </div>
                <h1 style="font-size: 22px; color: #1e293b; margin: 0 0 25px 0; text-align: center; font-weight: 800;">
                    "${title}"
                </h1>
                <div style="background-color: #eff6ff; border: 1px solid #dbeafe; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
                    <strong style="color: #1d4ed8;">En Curso</strong><br>
                    <span style="font-size: 13px; color: #3b82f6;">Comenzando a trabajar.</span>
                </div>
                ${generateGenericTable()}
            `;
            break;
        case TaskStatus.TO_DO:
            subject = `En el Radar: ${title}`;
            bodyContent = `
                <div style="text-align: center; margin-bottom: 10px;">
                    <span style="font-size: 40px;">📡</span>
                </div>
                <h1 style="font-size: 22px; color: #1e293b; margin: 0 0 20px 0; text-align: center; font-weight: 800;">
                    "${title}"
                </h1>
                <p style="text-align: center; font-size: 14px; color: #475569; margin-bottom: 25px;">
                    Se aproxima el momento para trabajar en esta tarea.
                </p>
                ${generateGenericTable()}
            `;
            break;
        case TaskStatus.COMPLETED:
            subject = `Tarea Completada: ${title}`;
            bodyContent = `
                <div style="text-align: center; margin-bottom: 10px;">
                    <span style="font-size: 48px;">🎉</span>
                </div>
                <h2 style="font-size: 20px; color: #10b981; font-weight: 800; margin: 0 0 10px 0; text-align: center;">
                    Tarea Finalizada
                </h2>
                <h1 style="font-size: 22px; color: #1e293b; margin: 0 0 25px 0; text-align: center; font-weight: 900;">
                    "${title}"
                </h1>
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 25px; border-radius: 16px; margin-bottom: 25px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <p style="margin: 0 0 15px 0; font-size: 13px; color: #166534; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">
                        Resumen de Tiempo Final
                    </p>
                    <div style="display: inline-block; margin: 0 20px;">
                        <span style="display: block; font-size: 10px; color: #16a34a; font-weight: bold; text-transform: uppercase;">Estimado</span>
                        <span style="font-size: 24px; font-weight: 900; color: #166534;">${estimatedHours} hs</span>
                    </div>
                    <div style="display: inline-block; margin: 0 20px; border-left: 2px solid #bbf7d0; padding-left: 40px;">
                        <span style="display: block; font-size: 10px; color: #059669; font-weight: bold; text-transform: uppercase;">Tiempo Real</span>
                        <span style="font-size: 32px; font-weight: 900; color: #059669; line-height: 1;">${usedHours} hs</span>
                    </div>
                </div>
                ${generateGenericTable(true)}
            `;
            break;
        default:
            subject = `Estado Actualizado: ${title}`;
            bodyContent = `
                <h2 style="font-size: 16px; color: #64748b; margin: 0 0 5px 0;">
                    Estado: <strong>${status}</strong>
                </h2>
                <h1 style="font-size: 22px; color: #1e293b; margin: 0 0 20px 0;">
                    ${title}
                </h1>
                ${generateGenericTable()}
            `;
            break;
    }
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                        <tr><td style="height: 6px; background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);"></td></tr>
                        <tr>
                            <td style="padding: 40px;">
                                ${bodyContent}
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                                    <tr>
                                        <td align="center">
                                            <a href="${APP_LINK}" style="background-color: #0f172a; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                                Ver Tarea en App
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                    Enviado por <strong>TuDú EO</strong>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `;

  try {
      // Enviar correos a los participantes (excepto al que hizo la acción)
      for (const recipient of uniqueRecipients) {
          try {
              await sendRawEmail(recipient.email, subject, htmlContent);
              console.log(`✅ Email (${type}) enviado a participante: ${recipient.email}`);
          } catch (innerError) {
              console.error(`❌ Error al enviar email a ${recipient.email}:`, innerError);
          }
      }

      // Enviar copia de seguridad al administrador si las condiciones se cumplen
      if (shouldSendAdminCopy) {
          console.log(`📨 Enviando copia de seguridad al administrador: ${adminEmail}`);
          try {
              await sendRawEmail(adminEmail!, subject, htmlContent);
          } catch (adminError) {
              console.error(`❌ Error al enviar copia a admin ${adminEmail}:`, adminError);
          }
      } else {
          console.log(`ℹ️ Omitiendo copia al administrador. Motivo: ${
              !normalizedAdminEmail ? 'Admin no definido' : 
              normalizedAdminEmail === normalizedActorEmail ? 'Admin es el autor de la acción' : 
              'Admin ya recibió el correo como participante'
          }.`);
      }

  } catch (error) {
      console.error("Error general en proceso de envío de email:", error);
  }
};
