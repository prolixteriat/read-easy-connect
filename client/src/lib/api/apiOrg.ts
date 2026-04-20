import { z } from 'zod';

import { apiBaseUrl } from '@lib/config';
import { type IApiResponse, posterAuth } from './posterAuth';

// -----------------------------------------------------------------------------

const AddAffiliateSchema = z.object({
    name: z.string(),
    region_id: z.number(),
});

export type TAddAffiliateData = z.TypeOf<typeof AddAffiliateSchema>;

const EditAffiliateSchema = z.object({
    affiliate_id: z.number(),
    name: z.string().optional(),
    region_id: z.number().optional(),
    disabled: z.boolean().optional(),
});

export type TEditAffiliateData = z.TypeOf<typeof EditAffiliateSchema>;

const AddAreaSchema = z.object({
    name: z.string(),
    reader_area: z.number().optional(),
    org_area: z.number().optional(),
});

export type TAddAreaData = z.TypeOf<typeof AddAreaSchema>;

const EditAreaSchema = z.object({
    area_id: z.number(),
    name: z.string().optional(),
    disabled: z.boolean().optional(),
    reader_area: z.number().optional(),
    org_area: z.number().optional(),

});

export type TEditAreaData = z.TypeOf<typeof EditAreaSchema>;

const AddRegionSchema = z.object({
    name: z.string(),
});

const AddOrgSchema = z.object({
    name: z.string(),
    area_id: z.number().nullable().optional(),
    role_civic: z.number().optional(),
    role_donor: z.number().optional(),
    role_network: z.number().optional(),
    role_referrer: z.number().optional(),
    role_supplier: z.number().optional(),
    role_supporter: z.number().optional(),
    role_venue: z.number().optional(),
    role_volunteer: z.number().optional(),
    reader_venue: z.number().optional(),
    general_venue: z.number().optional(),
    address: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional(),
    status: z.string().optional(),
    summary: z.string().optional(),
    action: z.number().optional(),
});

export type TAddOrgData = z.TypeOf<typeof AddOrgSchema>;

const EditOrgSchema = z.object({
    org_id: z.number(),
    name: z.string().optional(),
    area_id: z.number().nullable().optional(),
    role_civic: z.number().optional(),
    role_donor: z.number().optional(),
    role_network: z.number().optional(),
    role_referrer: z.number().optional(),
    role_supplier: z.number().optional(),
    role_supporter: z.number().optional(),
    role_venue: z.number().optional(),
    role_volunteer: z.number().optional(),
    reader_venue: z.number().optional(),
    general_venue: z.number().optional(),
    address: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional(),
    status: z.string().optional(),
    summary: z.string().optional(),
    action: z.number().optional(),
    disabled: z.number().optional(),
});

export type TEditOrgData = z.TypeOf<typeof EditOrgSchema>;

export type TAddRegionData = z.TypeOf<typeof AddRegionSchema>;

const EditRegionSchema = z.object({
    region_id: z.number(),
    name: z.string().optional(),
    disabled: z.boolean().optional(),
});

export type TEditRegionData = z.TypeOf<typeof EditRegionSchema>;

const AddVenueSchema = z.object({
    name: z.string(),
    address: z.string().optional(),
    contact_name: z.string().optional(),
    contact_email: z.string().optional(),
    contact_telephone: z.string().optional(),
    notes: z.string().optional(),
});

export type TAddVenueData = z.TypeOf<typeof AddVenueSchema>;

const EditVenueSchema = z.object({
    venue_id: z.number(),
    name: z.string().optional(),
    address: z.string().optional(),
    contact_name: z.string().optional(),
    contact_email: z.string().optional(),
    contact_telephone: z.string().optional(),
    notes: z.string().optional(),
    disabled: z.number().optional(),
});

export type TEditVenueData = z.TypeOf<typeof EditVenueSchema>;

// -----------------------------------------------------------------------------

export async function addAffiliate(data: TAddAffiliateData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/org/add-affiliate`;
    return posterAuth(url, data, AddAffiliateSchema);
}

export async function editAffiliate(data: TEditAffiliateData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/org/edit-affiliate`;
    return posterAuth(url, data, EditAffiliateSchema);
}

export async function addArea(data: TAddAreaData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/org/add-area`;
    return posterAuth(url, data, AddAreaSchema);
}

export async function editArea(data: TEditAreaData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/org/edit-area`;
    return posterAuth(url, data, EditAreaSchema);
}

export async function addOrg(data: TAddOrgData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/org/add-org`;
    return posterAuth(url, data, AddOrgSchema);
}

export async function editOrg(data: TEditOrgData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/org/edit-org`;
    return posterAuth(url, data, EditOrgSchema);
}

export async function addRegion(data: TAddRegionData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/org/add-region`;
    return posterAuth(url, data, AddRegionSchema);
}

export async function editRegion(data: TEditRegionData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/org/edit-region`;
    return posterAuth(url, data, EditRegionSchema);
}

export async function addVenue(data: TAddVenueData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/org/add-venue`;
    return posterAuth(url, data, AddVenueSchema);
}

export async function editVenue(data: TEditVenueData): Promise<IApiResponse> {
    const url = `${apiBaseUrl}/org/edit-venue`;
    return posterAuth(url, data, EditVenueSchema);
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
