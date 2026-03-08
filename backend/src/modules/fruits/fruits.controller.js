import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createFruit,
  deleteFruit,
  listFruits,
  uploadFruitImage,
  updateFruit,
  updateFruitAvailability,
} from "./fruits.service.js";

export const getFruits = asyncHandler(async (req, res) => {
  const data = await listFruits(req.query);

  res.status(200).json({
    success: true,
    data,
  });
});

export const createFruitHandler = asyncHandler(async (req, res) => {
  const fruit = await createFruit(req.body);

  res.status(201).json({
    success: true,
    message: "Fruit created successfully.",
    data: fruit,
  });
});

export const uploadFruitImageHandler = asyncHandler(async (req, res) => {
  const uploadResult = await uploadFruitImage(req.file);

  res.status(201).json({
    success: true,
    message: "Fruit image uploaded successfully.",
    data: uploadResult,
  });
});

export const updateFruitHandler = asyncHandler(async (req, res) => {
  const fruit = await updateFruit(req.params.fruitId, req.body);

  res.status(200).json({
    success: true,
    message: "Fruit updated successfully.",
    data: fruit,
  });
});

export const deleteFruitHandler = asyncHandler(async (req, res) => {
  await deleteFruit(req.params.fruitId);

  res.status(200).json({
    success: true,
    message: "Fruit deleted successfully.",
  });
});

export const toggleAvailabilityHandler = asyncHandler(async (req, res) => {
  const fruit = await updateFruitAvailability(
    req.params.fruitId,
    req.body.isAvailable,
  );

  res.status(200).json({
    success: true,
    message: "Fruit availability updated successfully.",
    data: fruit,
  });
});
