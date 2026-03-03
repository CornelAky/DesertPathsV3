/*
  # Delete Orphaned Auth Users

  This migration removes auth users that don't have corresponding profiles in the users table.
  
  1. Deletes the following orphaned auth users:
     - bashairalhwet@gmail.com
     - sales@desertpaths.co
     - bashairalhweti@gmail.com
     - besh@gmail.com
     - mazin@desert.com
     - dcsdjcnsdlk@yahoo.com
     - mazinahmed6000@gmail.com
     - alina@desertpaths.co
     - marketing@desertpaths.co
  
  2. Keeps only the three required users:
     - info@desertpaths.co (admin)
     - gabriel@desertpaths.co (guide)
     - gabiromanian@yahoo.com (client)
*/

-- Delete orphaned auth users (users without profiles)
DELETE FROM auth.users 
WHERE id IN (
  '102f6602-c5ab-45be-bd78-d3f9efffdfd9',
  '2f415e83-6d29-45f5-8635-ac476e1ff44f',
  'd45e0fb1-d6b6-477e-a611-f692d797cb8e',
  'e3ab8efa-c739-4393-b1b9-0cd622f3d8a8',
  'd8c1c4d4-0ef9-4ed6-b1cc-0fc385138ded',
  '7f870e4c-a413-45dc-8232-eff39fea3ad0',
  'dda9d060-e7ed-4cbe-a428-1271c25d056f',
  '76358cbd-24e2-4cb6-9622-d6b43889718a',
  '98c33156-cd0a-4737-9468-ba0854de9140'
);