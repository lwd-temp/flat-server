import { Model } from "../../model";
import { dataSource } from "../../thirdPartyService/TypeORMService";
import { EntityTarget } from "typeorm/common/EntityTarget";
import { UserModel } from "../../model/user/User";
import { FindOptionsWhere } from "typeorm/find-options/FindOptionsWhere";
import { InsertQueryBuilder } from "typeorm/query-builder/InsertQueryBuilder";
import { EntityManager } from "typeorm/entity-manager/EntityManager";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { UserWeChatModel } from "../../model/user/WeChat";
import { UserAppleModel } from "../../model/user/Apple";
import { UserGithubModel } from "../../model/user/Github";
import { UserAgoraModel } from "../../model/user/Agora";
import { UserGoogleModel } from "../../model/user/Google";
import { UserPhoneModel } from "../../model/user/Phone";
import { RoomModel } from "../../model/room/Room";
import { RoomUserModel } from "../../model/room/RoomUser";
import { RoomPeriodicConfigModel } from "../../model/room/RoomPeriodicConfig";
import { RoomPeriodicModel } from "../../model/room/RoomPeriodic";
import { RoomPeriodicUserModel } from "../../model/room/RoomPeriodicUser";
import { RoomRecordModel } from "../../model/room/RoomRecord";
import { CloudStorageUserFilesModel } from "../../model/cloudStorage/CloudStorageUserFiles";
import { CloudStorageFilesModel } from "../../model/cloudStorage/CloudStorageFiles";
import { CloudStorageConfigsModel } from "../../model/cloudStorage/CloudStorageConfigs";

class DAO<M extends Model> {
    public constructor(private readonly model: EntityTarget<M>) {}

    public async findOne<T extends keyof M>(
        select: T | T[],
        where: FindOptionsWhere<M>,
        order?: [keyof M & string, "ASC" | "DESC"],
    ): Promise<Partial<Pick<M, T>>> {
        let sql = dataSource
            .getRepository(this.model)
            .createQueryBuilder()
            .select(DAOUtils.select(select))
            .where(DAOUtils.softDelete(where));

        if (order) {
            sql = sql.orderBy(...order);
        }
        return (await sql.getRawOne()) || {};
    }

    public async find<T extends keyof M>(
        select: T | T[],
        where: FindOptionsWhere<M>,
        config?: {
            order?: [keyof M & string, "ASC" | "DESC"];
            distinct?: boolean;
            limit?: number;
        },
    ): Promise<Pick<M, T>[]> {
        let sql = dataSource
            .getRepository(this.model)
            .createQueryBuilder()
            .select(DAOUtils.select(select))
            .where(DAOUtils.softDelete(where))
            .limit(config?.limit);

        if (config?.distinct) {
            sql = sql.distinct(config.distinct);
        }

        if (config?.order) {
            sql = sql.orderBy(...config.order);
        }

        return await sql.getRawMany();
    }

    public async insert<D extends Parameters<InsertQueryBuilder<M>["values"]>[0]>(
        t: EntityManager,
        data: D,
        config?: {
            orUpdate?: (keyof D & string)[];
            orIgnore?: boolean;
        },
    ): Promise<void> {
        let sql = t
            .createQueryBuilder()
            .insert()
            .into(this.model)
            .values(data)
            .orIgnore(config?.orIgnore);

        if (config?.orUpdate) {
            sql = sql.orUpdate(config.orUpdate);
        }

        await sql.execute();
    }

    public async update(
        t: EntityManager,
        updateData: QueryDeepPartialEntity<M>,
        where: FindOptionsWhere<M>,
        config?: {
            order?: [keyof M & string, "ASC" | "DESC"];
            limit?: number;
        },
    ): Promise<void> {
        let sql = t
            .createQueryBuilder()
            .update(this.model)
            .set(updateData)
            .where(DAOUtils.softDelete(where))
            .limit(config?.limit);

        if (config?.order) {
            sql = sql.orderBy(...config.order);
        }

        await sql.execute();
    }

    public async delete(t: EntityManager, where: FindOptionsWhere<M>): Promise<void> {
        await this.update(
            t,
            // @ts-ignore
            {
                is_delete: true,
            },
            where,
        );
    }

    public async count(where: FindOptionsWhere<M>): Promise<number> {
        return await dataSource.getRepository(this.model).count({
            where: DAOUtils.softDelete(where),
        });
    }

    public async deleteHard(t: EntityManager, where: FindOptionsWhere<M>): Promise<void> {
        await t.createQueryBuilder().delete().from(this.model).where(where).execute();
    }
}

class DAOUtils {
    public static softDelete<T>(where: T): T {
        return {
            ...where,
            is_delete: false,
        };
    }

    public static select<T>(s: T | T[]): (T & string)[] {
        return (Array.isArray(s) ? s : [s]) as (T & string)[];
    }
}

export const userDAO = new DAO(UserModel);
export const userWeChatDAO = new DAO(UserWeChatModel);
export const userGithubDAO = new DAO(UserGithubModel);
export const userAppleDAO = new DAO(UserAppleModel);
export const userAgoraDAO = new DAO(UserAgoraModel);
export const userGoogleDAO = new DAO(UserGoogleModel);
export const userPhoneDAO = new DAO(UserPhoneModel);
export const roomDAO = new DAO(RoomModel);
export const roomUserDAO = new DAO(RoomUserModel);
export const roomPeriodicConfigDAO = new DAO(RoomPeriodicConfigModel);
export const roomPeriodicDAO = new DAO(RoomPeriodicModel);
export const roomPeriodicUserDAO = new DAO(RoomPeriodicUserModel);
export const roomRecordDAO = new DAO(RoomRecordModel);
export const cloudStorageUserFilesDAO = new DAO(CloudStorageUserFilesModel);
export const cloudStorageFilesDAO = new DAO(CloudStorageFilesModel);
export const cloudStorageConfigsDAO = new DAO(CloudStorageConfigsModel);