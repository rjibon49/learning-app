
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

import { ConfigService } from "@nestjs/config";

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { PrismaService } from "../prisma.service.js";

import type {
  CreatePlacementInput,
  UpdatePlacementInput,
  CreateCampaignInput,
  UpdateCampaignInput,
  ListInput,
  DeliveryInput,
  ReportInput,
} from "./web-ads.schemas.js";

type TokenPayload = {
  campaignId: string;
  tokenId: string;
  expiresAt: number;
};

@Injectable()
export class WebAdsService {
  private readonly eventSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const secret = config.get<string>(
      "WEB_AD_EVENT_SECRET",
    );

    if (!secret || secret.length < 32) {
      throw new Error(
        "WEB_AD_EVENT_SECRET must contain at least 32 characters",
      );
    }

    this.eventSecret = secret;
  }

  // ==========================================
  // PLACEMENTS
  // ==========================================

  async listPlacements(query: ListInput) {
    const where = {
      ...(query.siteKey
        ? { siteKey: query.siteKey }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.webAdPlacement.count({ where }),

      this.prisma.webAdPlacement.findMany({
        where,
        orderBy: [
          { siteKey: "asc" },
          { key: "asc" },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          _count: {
            select: { campaigns: true },
          },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(
          1,
          Math.ceil(total / query.limit),
        ),
      },
    };
  }

  async createPlacement(input: CreatePlacementInput) {
    const existing =
      await this.prisma.webAdPlacement.findUnique({
        where: {
          siteKey_key: {
            siteKey: input.siteKey,
            key: input.key,
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        "This placement already exists for the website",
      );
    }

    return this.prisma.webAdPlacement.create({
      data: input,
    });
  }

  async updatePlacement(
    id: string,
    input: UpdatePlacementInput,
  ) {
    await this.requirePlacement(id);

    return this.prisma.webAdPlacement.update({
      where: { id },
      data: input,
    });
  }

  async archivePlacement(id: string) {
    await this.requirePlacement(id);

    return this.prisma.webAdPlacement.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async requirePlacement(id: string) {
    const placement =
      await this.prisma.webAdPlacement.findUnique({
        where: { id },
      });

    if (!placement) {
      throw new NotFoundException(
        "Ad placement not found",
      );
    }

    return placement;
  }

  // ==========================================
  // CAMPAIGNS
  // ==========================================

  async listCampaigns(query: ListInput) {
    const where = {
      ...(query.placementId
        ? { placementId: query.placementId }
        : {}),
      ...(query.siteKey
        ? { placement: { siteKey: query.siteKey } }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.webAdCampaign.count({ where }),

      this.prisma.webAdCampaign.findMany({
        where,
        include: {
          placement: true,
          _count: {
            select: { events: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(
          1,
          Math.ceil(total / query.limit),
        ),
      },
    };
  }

  async getCampaign(id: string) {
    const campaign =
      await this.prisma.webAdCampaign.findUnique({
        where: { id },
        include: { placement: true },
      });

    if (!campaign) {
      throw new NotFoundException(
        "Ad campaign not found",
      );
    }

    return campaign;
  }

  private async validateCreative(
    input: CreateCampaignInput,
  ) {
    if (
      input.startsAt &&
      input.endsAt &&
      new Date(input.endsAt) <=
        new Date(input.startsAt)
    ) {
      throw new BadRequestException(
        "End date must be after start date",
      );
    }

    if (input.kind === "LOCAL_IMAGE") {
      if (
        input.status === "ACTIVE" &&
        (!input.mediaAssetId ||
          !input.destinationUrl)
      ) {
        throw new BadRequestException(
          "Active local ads require an image and destination URL",
        );
      }

      if (input.mediaAssetId) {
        const asset =
          await this.prisma.mediaAsset.findUnique({
            where: { id: input.mediaAssetId },
          });

        if (
          !asset ||
          asset.type !== "IMAGE" ||
          asset.status !== "READY" ||
          asset.visibility !== "PUBLIC" ||
          !asset.publicUrl ||
          !asset.publicUrl.startsWith("https://")
        ) {
          throw new BadRequestException(
            "Select a READY, PUBLIC image from Media Library",
          );
        }
      }
    } else {
      if (
        input.status === "ACTIVE" &&
        (!input.providerClient ||
          !input.providerSlot)
      ) {
        throw new BadRequestException(
          "Active third-party ads require provider client and slot IDs",
        );
      }

      if (
        input.kind === "ADSENSE" &&
        input.providerClient &&
        !/^ca-pub-\d{10,20}$/.test(
          input.providerClient,
        )
      ) {
        throw new BadRequestException(
          "Invalid AdSense publisher ID",
        );
      }
    }
  }

  async createCampaign(input: CreateCampaignInput) {
    await this.requirePlacement(input.placementId);
    await this.validateCreative(input);

    const {
      startsAt,
      endsAt,
      ...data
    } = input;

    return this.prisma.webAdCampaign.create({
      data: {
        ...data,
        startsAt: startsAt
          ? new Date(startsAt)
          : null,
        endsAt: endsAt
          ? new Date(endsAt)
          : null,
      },
    });
  }

  async updateCampaign(
    id: string,
    input: UpdateCampaignInput,
  ) {
    const old = await this.getCampaign(id);

    const merged: CreateCampaignInput = {
      placementId: old.placementId,
      name: input.name ?? old.name,
      kind: input.kind ?? old.kind,
      status:
        input.status ?? (
          old.status === "ARCHIVED"
            ? "ARCHIVED" as never
            : old.status
        ),
      mediaAssetId:
        input.mediaAssetId === undefined
          ? old.mediaAssetId
          : input.mediaAssetId,
      destinationUrl:
        input.destinationUrl === undefined
          ? old.destinationUrl
          : input.destinationUrl,
      altText:
        input.altText === undefined
          ? old.altText
          : input.altText,
      providerClient:
        input.providerClient === undefined
          ? old.providerClient
          : input.providerClient,
      providerSlot:
        input.providerSlot === undefined
          ? old.providerSlot
          : input.providerSlot,
      startsAt:
        input.startsAt === undefined
          ? old.startsAt?.toISOString() ?? null
          : input.startsAt,
      endsAt:
        input.endsAt === undefined
          ? old.endsAt?.toISOString() ?? null
          : input.endsAt,
      priority: input.priority ?? old.priority,
      weight: input.weight ?? old.weight,
      languageCode:
        input.languageCode === undefined
          ? old.languageCode
          : input.languageCode,
      pagePrefix:
        input.pagePrefix === undefined
          ? old.pagePrefix
          : input.pagePrefix,
    };

    if (old.status === "ARCHIVED") {
      throw new BadRequestException(
        "Archived campaigns cannot be edited",
      );
    }

    await this.validateCreative(merged);

    const {
      startsAt,
      endsAt,
      placementId: _placementId,
      ...data
    } = merged;

    void _placementId;

    return this.prisma.webAdCampaign.update({
      where: { id },
      data: {
        ...data,
        startsAt: startsAt
          ? new Date(startsAt)
          : null,
        endsAt: endsAt
          ? new Date(endsAt)
          : null,
      },
    });
  }

  async archiveCampaign(id: string) {
    const campaign = await this.getCampaign(id);

    if (campaign.status === "ARCHIVED") {
      return campaign;
    }

    return this.prisma.webAdCampaign.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  }

  // ==========================================
  // SIGNED TRACKING TOKENS
  // ==========================================

  private issueToken(campaignId: string) {
    const payload: TokenPayload = {
      campaignId,
      tokenId: randomBytes(16).toString("hex"),
      expiresAt: Date.now() + 60 * 60 * 1000,
    };

    const encoded = Buffer
      .from(JSON.stringify(payload))
      .toString("base64url");

    const signature = createHmac(
      "sha256",
      this.eventSecret,
    )
      .update(encoded)
      .digest("base64url");

    return `${encoded}.${signature}`;
  }

  private verifyToken(token: string): TokenPayload {
    const parts = token.split(".");

    if (parts.length !== 2) {
      throw new BadRequestException(
        "Invalid ad event token",
      );
    }

    const [encoded, signature] = parts;

    const expected = createHmac(
      "sha256",
      this.eventSecret,
    )
      .update(encoded)
      .digest();

    let supplied: Buffer;

    try {
      supplied = Buffer.from(
        signature,
        "base64url",
      );
    } catch {
      throw new BadRequestException(
        "Invalid ad event signature",
      );
    }

    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      throw new BadRequestException(
        "Invalid ad event signature",
      );
    }

    let payload: TokenPayload;

    try {
      payload = JSON.parse(
        Buffer.from(
          encoded,
          "base64url",
        ).toString("utf8"),
      ) as TokenPayload;
    } catch {
      throw new BadRequestException(
        "Invalid ad event payload",
      );
    }

    if (
      typeof payload.campaignId !== "string" ||
      typeof payload.tokenId !== "string" ||
      !/^[0-9a-f]{32}$/.test(
        payload.tokenId,
      ) ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < Date.now() ||
      payload.expiresAt > Date.now() +
        60 * 60 * 1000
    ) {
      throw new BadRequestException(
        "Expired or invalid ad event token",
      );
    }

    return payload;
  }

  // ==========================================
  // PUBLIC AD DELIVERY
  // ==========================================

  async deliver(query: DeliveryInput) {
    const placement =
      await this.prisma.webAdPlacement.findUnique({
        where: {
          siteKey_key: {
            siteKey: query.siteKey,
            key: query.placementKey,
          },
        },
      });

    if (!placement || !placement.isActive) {
      return { filled: false };
    }

    const now = new Date();

    const candidates =
      await this.prisma.webAdCampaign.findMany({
        where: {
          placementId: placement.id,
          status: "ACTIVE",

          AND: [
            {
              OR: [
                { startsAt: null },
                { startsAt: { lte: now } },
              ],
            },
            {
              OR: [
                { endsAt: null },
                { endsAt: { gt: now } },
              ],
            },
          ],
        },
        orderBy: [
          { priority: "desc" },
          { createdAt: "asc" },
        ],
        take: 100,
      });

    const eligible = candidates.filter(
      (campaign) => {
        if (
          campaign.languageCode &&
          campaign.languageCode !==
            query.languageCode
        ) {
          return false;
        }

        if (
          campaign.pagePrefix &&
          !(
            query.pagePath === campaign.pagePrefix ||
            query.pagePath.startsWith(
              campaign.pagePrefix.endsWith("/")
                ? campaign.pagePrefix
                : `${campaign.pagePrefix}/`,
            )
          )
        ) {
          return false;
        }

        return true;
      },
    );

    if (eligible.length === 0) {
      return { filled: false };
    }

    // Only top-priority campaigns compete.
    const topPriority = eligible[0].priority;

    const top = eligible.filter(
      (item) => item.priority === topPriority,
    );

    const totalWeight = top.reduce(
      (sum, item) => sum + item.weight,
      0,
    );

    let ticket = randomBytes(4)
      .readUInt32BE(0) % totalWeight;

    let chosen = top[0];

    for (const campaign of top) {
      ticket -= campaign.weight;

      if (ticket < 0) {
        chosen = campaign;
        break;
      }
    }

    let imageUrl: string | null = null;

    if (chosen.kind === "LOCAL_IMAGE") {
      if (!chosen.mediaAssetId) {
        return { filled: false };
      }

      const asset =
        await this.prisma.mediaAsset.findUnique({
          where: {
            id: chosen.mediaAssetId,
          },
        });

      if (
        !asset ||
        asset.type !== "IMAGE" ||
        asset.status !== "READY" ||
        asset.visibility !== "PUBLIC" ||
        !asset.publicUrl ||
        !asset.publicUrl.startsWith("https://")
      ) {
        return { filled: false };
      }

      imageUrl = asset.publicUrl;
    }

    return {
      filled: true,
      campaignId: chosen.id,
      kind: chosen.kind,
      placement: {
        key: placement.key,
        width: placement.width,
        height: placement.height,
      },
      token: this.issueToken(chosen.id),

      creative:
        chosen.kind === "LOCAL_IMAGE"
          ? {
              imageUrl,
              altText: chosen.altText ?? "",
            }
          : {
              providerClient:
                chosen.providerClient,
              providerSlot:
                chosen.providerSlot,
            },
    };
  }

  // ==========================================
  // TRACKING
  // ==========================================

  private async recordEvent(
    token: string,
    kind: "IMPRESSION" | "CLICK",
  ) {
    const payload = this.verifyToken(token);

    const campaign =
      await this.prisma.webAdCampaign.findUnique({
        where: {
          id: payload.campaignId,
        },
      });

    if (!campaign) {
      throw new NotFoundException(
        "Campaign not found",
      );
    }

    try {
      await this.prisma.webAdEvent.create({
        data: {
          campaignId: campaign.id,
          tokenId: payload.tokenId,
          kind,
        },
      });
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? error.code
          : null;

      if (code !== "P2002") {
        throw error;
      }

      // Duplicate event for the same delivery.
    }

    return campaign;
  }

  async impression(token: string) {
    await this.recordEvent(
      token,
      "IMPRESSION",
    );

    return { success: true };
  }

  async click(token: string): Promise<string> {
    const campaign =
      await this.recordEvent(token, "CLICK");

    if (
      campaign.kind !== "LOCAL_IMAGE" ||
      !campaign.destinationUrl
    ) {
      throw new BadRequestException(
        "Click redirect not supported",
      );
    }

    const url = new URL(
      campaign.destinationUrl,
    );

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password
    ) {
      throw new BadRequestException(
        "Invalid destination",
      );
    }

    return url.toString();
  }

  // ==========================================
  // REPORTING
  // ==========================================

  async report(query: ReportInput) {
    const since = new Date(
      Date.now() -
      query.days * 24 * 60 * 60 * 1000,
    );

    const campaigns =
      await this.prisma.webAdCampaign.findMany({
        where: {
          placement: {
            siteKey: query.siteKey,
          },
        },
        select: {
          id: true,
          name: true,
          kind: true,
          status: true,
          placement: {
            select: {
              key: true,
            },
          },
        },
      });

    const counts =
      await this.prisma.webAdEvent.groupBy({
        by: ["campaignId", "kind"],
        where: {
          campaign: {
            placement: {
              siteKey: query.siteKey,
            },
          },
          createdAt: {
            gte: since,
          },
        },
        _count: {
          _all: true,
        },
      });

    const rows = campaigns.map((campaign) => {
      const impressions = counts.find(
        (item) =>
          item.campaignId === campaign.id &&
          item.kind === "IMPRESSION",
      )?._count._all ?? 0;

      const clicks = counts.find(
        (item) =>
          item.campaignId === campaign.id &&
          item.kind === "CLICK",
      )?._count._all ?? 0;

      return {
        ...campaign,
        impressions,
        clicks,
        ctr:
          impressions > 0
            ? Number(
                (
                  (clicks / impressions) *
                  100
                ).toFixed(2),
              )
            : 0,
      };
    });

    return {
      siteKey: query.siteKey,
      days: query.days,
      rows,
      totals: {
        impressions: rows.reduce(
          (sum, row) => sum + row.impressions,
          0,
        ),
        clicks: rows.reduce(
          (sum, row) => sum + row.clicks,
          0,
        ),
      },
    };
  }
}
