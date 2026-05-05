import {
    type AttributeCallback,
    type AttributeCallbackMapping,
    type AttributeMappingDto,
    AttributeType,
    type BaseAttributeConstraint,
    type BaseAttributeContentDtoV2,
    type BaseAttributeContentDtoV3,
    type BaseAttributeDto,
    type BooleanAttributeContentV2,
    type BooleanAttributeContentV3,
    type CodeBlockAttributeContentData,
    type CodeBlockAttributeContentV2,
    type CodeBlockAttributeContentV3,
    type CredentialAttributeContentData,
    type CredentialAttributeContentV2,
    type CustomAttribute,
    type CustomAttributeProperties,
    type DataAttribute,
    type DataAttributeProperties,
    type DateAttributeContentV2,
    type DateAttributeContentV3,
    type DateTimeAttributeConstraint,
    type DateTimeAttributeConstraintData,
    type DateTimeAttributeContentV2,
    type DateTimeAttributeContentV3,
    type FileAttributeContentData,
    type FileAttributeContentV2,
    type FileAttributeContentV3,
    type FloatAttributeContentV2,
    type FloatAttributeContentV3,
    type GroupAttributeV2,
    type GroupAttributeV3,
    type InfoAttributeProperties,
    type InfoAttributeV2,
    type InfoAttributeV3,
    type IntegerAttributeContentV2,
    type IntegerAttributeContentV3,
    type MetadataAttributeProperties,
    type MetadataAttributeV2,
    type MetadataAttributeV3,
    type ObjectAttributeContentV2,
    type ObjectAttributeContentV3,
    type RangeAttributeConstraint,
    type RangeAttributeConstraintData,
    type RegexpAttributeConstraint,
    type RequestAttribute,
    type ResponseAttribute,
    type SecretAttributeContentData,
    type SecretAttributeContentV2,
    type StringAttributeContentV2,
    type StringAttributeContentV3,
    type TextAttributeContentV2,
    type TextAttributeContentV3,
    type TimeAttributeContentV2,
    type TimeAttributeContentV3,
} from 'types/openapi';

// Union types for backward compatibility (when version is unknown)
type BooleanAttributeContent = BooleanAttributeContentV2 | BooleanAttributeContentV3;
type CodeBlockAttributeContent = CodeBlockAttributeContentV2 | CodeBlockAttributeContentV3;
type CredentialAttributeContent = CredentialAttributeContentV2;
type DateAttributeContent = DateAttributeContentV2 | DateAttributeContentV3;
type DateTimeAttributeContent = DateTimeAttributeContentV2 | DateTimeAttributeContentV3;
type FileAttributeContent = FileAttributeContentV2 | FileAttributeContentV3;
type FloatAttributeContent = FloatAttributeContentV2 | FloatAttributeContentV3;
type GroupAttribute = GroupAttributeV2 | GroupAttributeV3;
type InfoAttribute = InfoAttributeV2 | InfoAttributeV3;
type IntegerAttributeContent = IntegerAttributeContentV2 | IntegerAttributeContentV3;
type MetadataAttribute = MetadataAttributeV2 | MetadataAttributeV3;
type ObjectAttributeContent = ObjectAttributeContentV2 | ObjectAttributeContentV3;
type SecretAttributeContent = SecretAttributeContentV2;
type StringAttributeContent = StringAttributeContentV2 | StringAttributeContentV3;
type TextAttributeContent = TextAttributeContentV2 | TextAttributeContentV3;
type TimeAttributeContent = TimeAttributeContentV2 | TimeAttributeContentV3;
type BaseAttributeContent = BaseAttributeContentDtoV2 | BaseAttributeContentDtoV3;

// Version-specific types: use V2 types for v2 attributes, V3 types for v3 attributes
export type BooleanAttributeContentDtoV2 = BooleanAttributeContentV2;
export type BooleanAttributeContentDtoV3 = BooleanAttributeContentV3;
export type CodeBlockAttributeContentDtoV2 = CodeBlockAttributeContentV2;
export type CodeBlockAttributeContentDtoV3 = CodeBlockAttributeContentV3;
export type DateAttributeContentDtoV2 = DateAttributeContentV2;
export type DateAttributeContentDtoV3 = DateAttributeContentV3;
export type DateTimeAttributeContentDtoV2 = DateTimeAttributeContentV2;
export type DateTimeAttributeContentDtoV3 = DateTimeAttributeContentV3;
export type FileAttributeContentDtoV2 = FileAttributeContentV2;
export type FileAttributeContentDtoV3 = FileAttributeContentV3;
export type FloatAttributeContentDtoV2 = FloatAttributeContentV2;
export type FloatAttributeContentDtoV3 = FloatAttributeContentV3;
export type IntegerAttributeContentDtoV2 = IntegerAttributeContentV2;
export type IntegerAttributeContentDtoV3 = IntegerAttributeContentV3;
export type ObjectAttributeContentDtoV2 = ObjectAttributeContentV2;
export type ObjectAttributeContentDtoV3 = ObjectAttributeContentV3;
export type StringAttributeContentDtoV2 = StringAttributeContentV2;
export type StringAttributeContentDtoV3 = StringAttributeContentV3;
export type TextAttributeContentDtoV2 = TextAttributeContentV2;
export type TextAttributeContentDtoV3 = TextAttributeContentV3;
export type TimeAttributeContentDtoV2 = TimeAttributeContentV2;
export type TimeAttributeContentDtoV3 = TimeAttributeContentV3;

export type { BaseAttributeContentDtoV2, BaseAttributeContentDtoV3 } from 'types/openapi';

export type BooleanAttributeContentDto = BooleanAttributeContent;
export type BooleanAttributeContentModel = BooleanAttributeContentDto;

export type CredentialAttributeContentDataDto = CredentialAttributeContentData;
export type CredentialAttributeContentDataModel = Omit<CredentialAttributeContentDataDto, 'attributes'> & {
    attributes: Array<DataAttributeModel>;
};

export type CredentialAttributeContentDto = CredentialAttributeContent;
export type CredentialAttributeContentModel = Omit<CredentialAttributeContentDto, 'data'> & { data: CredentialAttributeContentDataModel };

export type DateAttributeContentDto = DateAttributeContent;
export type DateAttributeContentModel = DateAttributeContentDto;

export type DateTimeAttributeContentDto = DateTimeAttributeContent;
export type DateTimeAttributeContentModel = DateTimeAttributeContentDto;

export type FileAttributeContentDataDto = FileAttributeContentData;
export type FileAttributeContentDataModel = FileAttributeContentDataDto;

export type FileAttributeContentDto = FileAttributeContent;
export type FileAttributeContentModel = Omit<FileAttributeContentDto, 'data'> & { data: FileAttributeContentDataModel };

export type CodeBlockAttributeContentDataDto = CodeBlockAttributeContentData;
export type CodeBlockAttributeContentDataModel = CodeBlockAttributeContentDataDto;

export type CodeBlockAttributeContentDto = CodeBlockAttributeContent;
export type CodeBlockAttributeContentModel = Omit<CodeBlockAttributeContentDto, 'data'> & {
    data: CodeBlockAttributeContentDataModel;
};

export type FloatAttributeContentDto = FloatAttributeContent;
export type FloatAttributeContentModel = FloatAttributeContentDto;

export type IntegerAttributeContentDto = IntegerAttributeContent;
export type IntegerAttributeContentModel = IntegerAttributeContentDto;

export type ObjectAttributeContentDto = ObjectAttributeContent;
export type ObjectAttributeContentModel = ObjectAttributeContentDto;

export type SecretAttributeContentDataDto = SecretAttributeContentData;
export type SecretAttributeContentDataModel = SecretAttributeContentDataDto;

export type SecretAttributeContentDto = SecretAttributeContent;
export type SecretAttributeContentModel = Omit<SecretAttributeContentDto, 'data'> & { data: SecretAttributeContentDataModel };

export type StringAttributeContentDto = StringAttributeContent;
export type StringAttributeContentModel = StringAttributeContentDto;

export type TextAttributeContentDto = TextAttributeContent;
export type TextAttributeContentModel = TextAttributeContentDto;

export type TimeAttributeContentDto = TimeAttributeContent;
export type TimeAttributeContentModel = TimeAttributeContentDto;

export type BaseAttributeContentDto = BaseAttributeContent;
export type BaseAttributeContentModel =
    | BooleanAttributeContentModel
    | CredentialAttributeContentModel
    | DateAttributeContentModel
    | DateTimeAttributeContentModel
    | FileAttributeContentModel
    | FloatAttributeContentModel
    | IntegerAttributeContentModel
    | ObjectAttributeContentModel
    | SecretAttributeContentModel
    | StringAttributeContentModel
    | TextAttributeContentModel
    | TimeAttributeContentModel
    | CodeBlockAttributeContentModel;

export type AttributeRequestDto = RequestAttribute;
export type AttributeRequestModelV2 = Omit<AttributeRequestDto, 'content'> & { content: Array<BaseAttributeContentDtoV2> };
export type AttributeRequestModelV3 = Omit<AttributeRequestDto, 'content'> & { content: Array<BaseAttributeContentDtoV3> };
export type AttributeRequestModel = AttributeRequestModelV2 | AttributeRequestModelV3;

export type MappingAttributeDto = AttributeMappingDto;
export type AttributeMappingModel = MappingAttributeDto;

export type AttributeResponseDto = ResponseAttribute;
export type AttributeResponseModelV2 = Omit<AttributeResponseDto, 'content'> & { content?: Array<BaseAttributeContentDtoV2> };
export type AttributeResponseModelV3 = Omit<AttributeResponseDto, 'content'> & { content?: Array<BaseAttributeContentDtoV3> };
export type AttributeResponseModel = AttributeResponseModelV2 | AttributeResponseModelV3;

export type DataAttributePropertiesDto = DataAttributeProperties;
export type DataAttributePropertiesModel = DataAttributePropertiesDto;

export type DateTimeAttributeConstraintDataDto = DateTimeAttributeConstraintData;
export type DateTimeAttributeConstraintDataModel = DateTimeAttributeConstraintDataDto;

export type DateTimeAttributeConstraintDto = DateTimeAttributeConstraint;
export type DateTimeAttributeConstraintModel = Omit<DateTimeAttributeConstraintDto, 'data'> & {
    data?: DateTimeAttributeConstraintDataModel;
};

export type RangeAttributeConstraintDataDto = RangeAttributeConstraintData;
export type RangeAttributeConstraintDataModel = RangeAttributeConstraintDataDto;

export type RangeAttributeConstraintDto = RangeAttributeConstraint;
export type RangeAttributeConstraintModel = Omit<RangeAttributeConstraintDto, 'data'> & { data?: RangeAttributeConstraintDataModel };

export type RegexpAttributeConstraintDto = RegexpAttributeConstraint;
export type RegexpAttributeConstraintModel = RegexpAttributeConstraintDto;

export type BaseAttributeConstraintDto = BaseAttributeConstraint;
export type BaseAttributeConstraintModel =
    | DateTimeAttributeConstraintModel
    | RangeAttributeConstraintModel
    | RegexpAttributeConstraintModel;

export type AttributeCallbackMappingDto = AttributeCallbackMapping;
export type AttributeCallbackMappingModel = AttributeCallbackMappingDto;

export type AttributeCallbackDto = AttributeCallback;
export type AttributeCallbackModel = Omit<AttributeCallbackDto, 'mappings'> & { mappings: Array<AttributeCallbackMappingModel> };

export type DataAttributeDto = DataAttribute;
export type DataAttributeModel = Omit<DataAttributeDto, 'content | properties | constraints | attributeCallback'> & {
    content?: Array<BaseAttributeContentModel>;
    properties: DataAttributePropertiesModel;
    constraints?: Array<BaseAttributeConstraintModel>;
    attributeCallback?: AttributeCallbackModel;
};

export type GroupAttributeDto = GroupAttribute;
export type GroupAttributeModel = Omit<GroupAttributeDto, 'content | attributeCallback'> & {
    content?: Array<AttributeDescriptorModel>;
    attributeCallback?: AttributeCallbackModel;
};

export type InfoAttributePropertiesDto = InfoAttributeProperties;
export type InfoAttributePropertiesModel = InfoAttributePropertiesDto;

export type InfoAttributeDto = InfoAttribute;
export type InfoAttributeModel = Omit<InfoAttributeDto, 'content | properties'> & {
    content: Array<BaseAttributeContentModel>;
    properties: InfoAttributePropertiesModel;
};

export type CustomAttributePropertiesDto = CustomAttributeProperties;
export type CustomAttributePropertiesModel = CustomAttributePropertiesDto;

export type CustomAttributeDto = CustomAttribute;
export type CustomAttributeModel = Omit<CustomAttributeDto, 'content | properties'> & {
    content?: Array<BaseAttributeContentModel>;
    properties: CustomAttributePropertiesModel;
};

export type MetadataAttributePropertiesDto = MetadataAttributeProperties;
export type MetadataAttributePropertiesModel = MetadataAttributePropertiesDto;

export type MetadataAttributeDto = MetadataAttribute;
export type MetadataAttributeModel = Omit<MetadataAttributeDto, 'content | properties'> & {
    content: Array<BaseAttributeContentModel>;
    properties: MetadataAttributePropertiesModel;
};

export type AttributeDescriptorDto = BaseAttributeDto;
export type AttributeDescriptorModel =
    | DataAttributeModel
    | GroupAttributeModel
    | InfoAttributeModel
    | CustomAttributeModel
    | MetadataAttributeModel;

export type AttributeDescriptorCollectionDto = {
    [functionGroup: string]: {
        [kind: string]: AttributeDescriptorDto[];
    };
};

export type AttributeDescriptorCollectionModel = {
    [functionGroup: string]: {
        [kind: string]: AttributeDescriptorModel[];
    };
};

export const isDataAttributeModel = (attribute: AttributeDescriptorModel): attribute is DataAttributeModel => {
    return attribute.type === AttributeType.Data;
};

export const isInfoAttributeModel = (attribute: AttributeDescriptorModel): attribute is InfoAttributeModel => {
    return attribute.type === AttributeType.Info;
};

export const isGroupAttributeModel = (attribute: AttributeDescriptorModel): attribute is GroupAttributeModel => {
    return attribute.type === AttributeType.Group;
};

export const isCustomAttributeModel = (attribute: AttributeDescriptorModel): attribute is CustomAttributeModel => {
    return attribute.type === AttributeType.Custom;
};

export const isCustomAttributeModelArray = (attributes: AttributeDescriptorModel[]): attributes is CustomAttributeModel[] => {
    return attributes.every(isCustomAttributeModel);
};

export const isAttributeDescriptorModel = (attribute: object): attribute is AttributeDescriptorModel => {
    return (
        (attribute as AttributeDescriptorModel).name !== undefined &&
        (attribute as AttributeDescriptorModel).uuid !== undefined &&
        (attribute as AttributeDescriptorModel).type !== undefined
    );
};
