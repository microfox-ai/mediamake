import { z } from "zod";
import {
  booleanDataType,
  mediaDataType,
  mediasDataType,
  numberDataType,
  objectDataType,
  objectsDataType,
  stringDataType,
} from "../basic";
import { captionsDataType } from "../captions";
import { DataReferenceType, DataTypeDefinition } from "../types";

export const predefinedDataTypes: DataTypeDefinition[] = [
  stringDataType,
  numberDataType,
  booleanDataType,
  objectDataType,
  objectsDataType,
  mediaDataType,
  mediasDataType,
  captionsDataType,
];

const dataTypesMap = new Map(
  predefinedDataTypes.map((dataType) => [dataType.id, dataType]),
);

export const getDataTypeById = (
  id?: string,
): DataTypeDefinition | undefined => {
  if (!id) {
    return undefined;
  }

  return dataTypesMap.get(id);
};

export const getDataTypesForReferenceType = (
  referenceType: DataReferenceType,
): DataTypeDefinition[] => {
  return predefinedDataTypes.filter(
    (dataType) => dataType.referenceType === referenceType,
  );
};

export const getReferenceTypeOptions = (): Array<{
  value: DataReferenceType;
  label: string;
}> => {
  const seen = new Set<DataReferenceType>();
  return predefinedDataTypes.reduce<Array<{ value: DataReferenceType; label: string }>>(
    (acc, dataType) => {
      if (seen.has(dataType.referenceType)) {
        return acc;
      }
      seen.add(dataType.referenceType);
      acc.push({
        value: dataType.referenceType,
        label: dataType.title,
      });
      return acc;
    },
    [],
  );
};

export const getDefaultDataTypeForReferenceType = (
  referenceType: DataReferenceType,
): DataTypeDefinition | undefined => {
  return getDataTypesForReferenceType(referenceType)[0];
};

export const getDefaultValueForReferenceType = (
  referenceType: DataReferenceType,
) => {
  const dataType = getDefaultDataTypeForReferenceType(referenceType);
  if (!dataType) {
    return "";
  }
  return structuredClone(dataType.defaultValue);
};

export const getReferenceSchemaForType = (
  referenceType: DataReferenceType,
  dataTypeId?: string,
) => {
  const configuredDataType = getDataTypeById(dataTypeId);
  if (configuredDataType) {
    return configuredDataType.schema;
  }

  const fallbackDataType = getDefaultDataTypeForReferenceType(referenceType);
  if (fallbackDataType) {
    return fallbackDataType.schema;
  }
  return z.unknown();
};

