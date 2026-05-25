/*
  Import de la fonction clsx.
  Elle permet de combiner plusieurs classes CSS conditionnelles.
*/
import { clsx, type ClassValue } from "clsx";

/*
  Import de twMerge.
  Cette fonction fusionne les classes Tailwind et supprime
  les conflits (ex : p-2 et p-4).
*/
import { twMerge } from "tailwind-merge";

/*
  Fonction utilitaire utilisée pour fusionner proprement
  plusieurs classes CSS dans un projet React + Tailwind.
*/
export function cn(...inputs: ClassValue[]) {

  /*
    clsx combine les classes
    twMerge nettoie les conflits Tailwind
  */
  return twMerge(clsx(inputs));
}