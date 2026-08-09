# Menu Management Refactor

## What changed
- Added `shared/js/menu-service.js` as the only menu data source.
- Default dishes initialize automatically when `muralidhar_menu` is absent.
- Admin menu CRUD, visibility, price, category, image, and Best Seller changes now use LocalStorage.
- Customer menu reads only visible dishes through `MenuService.getVisibleMenu()`.
- Customer cart removes hidden/deleted dishes and refreshes edited dish details.
- Open Admin/Customer tabs synchronize through custom and native storage events.

## LocalStorage limitation
Images are stored as Data URLs and limited to 750KB per upload because browser LocalStorage usually has a small per-origin quota. A backend migration should store images in object/file storage and save only URLs in the database.

## Future backend migration
Keep the UI calling the MenuService API, then replace the LocalStorage internals with asynchronous HTTP methods. This preserves page-level code while changing persistence.
