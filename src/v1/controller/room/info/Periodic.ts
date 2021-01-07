import { FastifyReply } from "fastify";
import { FastifySchema, PatchRequest } from "../../../types/Server";
import { createQueryBuilder, getRepository } from "typeorm";
import { Status } from "../../../../Constants";
import { RoomPeriodicConfigModel } from "../../../model/room/RoomPeriodicConfig";
import { RoomPeriodicUserModel } from "../../../model/room/RoomPeriodicUser";
import { RoomStatus } from "../Constants";
import { RoomPeriodicModel } from "../../../model/room/RoomPeriodic";
import { ErrorCode } from "../../../../ErrorCode";

export const periodicInfo = async (
    req: PatchRequest<{
        Body: PeriodicInfoBody;
    }>,
    reply: FastifyReply,
): Promise<void> => {
    const { periodicUUID } = req.body;
    const { userUUID } = req.user;

    try {
        const checkUserExistPeriodicRoom = await getRepository(RoomPeriodicUserModel).findOne({
            select: ["id"],
            where: {
                periodic_uuid: periodicUUID,
                user_uuid: userUUID,
                is_delete: false,
            },
        });

        if (checkUserExistPeriodicRoom === undefined) {
            return reply.send({
                status: Status.Failed,
                code: ErrorCode.NotPermission,
            });
        }

        const periodicConfig = await getRepository(RoomPeriodicConfigModel).findOne({
            select: ["end_time", "rate", "owner_uuid", "periodic_status"],
            where: {
                periodic_uuid: periodicUUID,
                is_delete: false,
            },
        });

        if (periodicConfig === undefined) {
            return reply.send({
                status: Status.Failed,
                code: ErrorCode.PeriodicNotFound,
            });
        }

        if (periodicConfig.periodic_status === RoomStatus.Stopped) {
            return reply.send({
                status: Status.Failed,
                code: ErrorCode.PeriodicIsEnded,
            });
        }

        const rooms: Rooms[] = await createQueryBuilder(RoomPeriodicModel)
            .select(["room_status", "begin_time", "end_time", "fake_room_uuid"])
            .where(
                `periodic_uuid = :periodicUUID
                AND room_status IN (:...roomStatus)
                AND is_delete = false`,
                {
                    periodicUUID,
                    roomStatus: [RoomStatus.Pending, RoomStatus.Running],
                },
            )
            .getRawMany();

        // only in the case of very boundary, will come here
        if (rooms === undefined || rooms.length === 0) {
            return reply.send({
                status: Status.Failed,
                code: ErrorCode.CanRetry,
            });
        }

        return reply.send({
            status: Status.Success,
            data: {
                periodic: {
                    ownerUUID: periodicConfig.owner_uuid,
                    // choose one of end_time and rate
                    endTime: periodicConfig.rate === 0 ? periodicConfig.end_time : "",
                    rate: periodicConfig.rate,
                },
                rooms: rooms.map(({ fake_room_uuid, begin_time, end_time, room_status }) => {
                    return {
                        roomUUID: fake_room_uuid,
                        beginTime: begin_time,
                        endTime: end_time,
                        roomStatus: room_status,
                    };
                }),
            },
        });
    } catch (e) {
        console.error(e);
        return reply.send({
            status: Status.Failed,
            code: ErrorCode.CurrentProcessFailed,
        });
    }
};

interface PeriodicInfoBody {
    periodicUUID: string;
}

export const periodicInfoSchemaType: FastifySchema<{
    body: PeriodicInfoBody;
}> = {
    body: {
        type: "object",
        required: ["periodicUUID"],
        properties: {
            periodicUUID: {
                type: "string",
                format: "uuid-v4",
            },
        },
    },
};

interface Rooms {
    room_status: string;
    begin_time: Date;
    end_time: Date;
    fake_room_uuid: string;
}