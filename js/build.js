Fliplet.Widget.instance({
  name: 'file-list',
  displayName: 'File list',
  icon: 'fa-exchange',
  render: {
    dependencies: [],
    template: [
      '<div data-view="content"></div>',
    ].join(''),
    ready: async function () {
      let thisy = this;
      const populateFileList = (dataSourceEntryId = Fliplet.Navigate.query.dataSourceEntryId, dataSourceId = thisy.fields.dataSource) => {
        let columnName = thisy.fields.columnName; // TODO missing columName for list repeator
        let type = thisy.fields.type;

        if (!navigator.onLine) {
          return Fliplet.UI.Toast('Please connect device to the internet');
        } else if (!dataSourceEntryId) {
          return Fliplet.UI.Toast('Missing dataSourceEntryId as a query parameter');
        } else if (!dataSourceId) {
          return Fliplet.UI.Toast('Please select Data Source from the Flie list component configuration');
        } else if (!columnName) {
          return Fliplet.UI.Toast('Please select Column Name from File list component configuration');
        }

        // TODO remove connect and findById
        // pass record as parameter in the function when you have that informaion in the list repeator
        // we have it for now only in record container
        return Fliplet.DataSources.connect(dataSourceId).then(function (connection) {
          return connection.findById(dataSourceEntryId);
        }).then(function (record) {
          if (!checkArrayLinks(record.data[columnName])) {
            $(document).find('[data-helper="file-list"]').html(`<p>There are no ${type}s</p>`);
            return
          } else {
            let fileIDs = record.data[columnName].map(function (file) {
              let url = typeof file === 'string'
                ? file
                : file.url;

              return Fliplet.Media.getIdFromRemoteUrl(url);
            });

            // TODO check how to escape this call
            return Fliplet.Media.Files.getAll({
              files: fileIDs,
              fields: ['name', 'url', 'metadata', 'createdAt']
            }).then(function (files) {
              let filesInfo = files.map(function (file) {
                const extension = file.name.split('.').pop().toLowerCase();
                let type = '';

                switch (extension) {
                  case 'jpg':
                  case 'jpeg':
                  case 'png':
                  case 'gif':
                    type = 'image';
                    break;
                  case 'mp4':
                  case 'avi':
                  case 'mkv':
                  case 'mov':
                    type = 'video';
                    break;
                  default:
                    type = 'file';
                    break;
                }

                return {
                  type,
                  name: file.name,
                  size: file.metadata.size,
                  uploaded: file.createdAt,
                  url: file.url
                };
              }).sort(sortFilesByName);
              if (type == 'Image') {
                let data = {
                  images: filesInfo.map(el => {
                    return {
                      // title: el.name,
                      url: Fliplet.Media.authenticate(el.url)
                    }
                  }),
                  options: {
                    index: 0,
                    errorMsg: 'The photo cannot be loaded'
                  }
                };
                let images = data.images.map((el, index) => {
                  return `<div class="image-item-container" data-index="${index}">
                            <img src="${el.url}" />
                          </div>`
                })
                $(document).find('[data-helper="file-list"]').append(`
                  <div class="image-container">
                    ${images.join('')}
                  <div>
                `);

                $(document).find('.image-item-container').off('click').on('click', function () {
                  data.options.index = Number($(this).attr('data-index'));
                  Fliplet.Navigate.previewImages(data);
                })
              } else {
                let str = '';
                fileItems = [];
                filesInfo.forEach(el => {
                  fileItems.push(`<div class="file-container-item" data-link="${encodeURIComponent(el.url)}">
                  <div>
                    <p>${el.name}</p>
                    <p>Uploaded: ${moment(el.uploaded).format('MMM D, YYYY')} - ${convertBytesToLargerUnits(el.size)}</p>
                  </div>
                  <div><i class="fa fa-2x fa-angle-right" aria-hidden="true"></i></div>
                  </div>`)
                })

                str += `<div class="file-container">${fileItems.join('')}</div>`
                $(document).find('[data-helper="file-list"]').append(str);

                $(document).find('.file-container-item').off('click').on('click', function () {
                  let link = decodeURIComponent($(this).attr('data-link'));
                  window.open(Fliplet.Media.authenticate(link), '_blank');
                })
              }
            })
          }
        }).catch(e => {
          return Fliplet.parseError(e);
          // return Fliplet.UI.Toast(e.responseJSON.error);
        })
      }

      function checkArrayLinks(array) {
        if (array && Array.isArray(array)) {
          return true;
        }
        return false;
      }

      function sortFilesByName(a, b) {
        let aFileName = a.name.toUpperCase();
        let bFileName = b.name.toUpperCase();

        if (aFileName < bFileName) {
          return -1;
        }

        if (aFileName > bFileName) {
          return 1;
        }

        return 0;
      }

      function convertBytesToLargerUnits(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        let unitIndex = 0;

        while (bytes >= 1024 && unitIndex < units.length - 1) {
          bytes /= 1024;
          unitIndex++;
        }

        return `${bytes.toFixed(2)} ${units[unitIndex]}`;
      }

      if (Fliplet.RecordContainer) {
        Fliplet.Hooks.on('recordContainerDataRetrieved', function (options) {
          return populateFileList(options.entry.id, options.entry.dataSourceId, options.entry);
        });
      } else {
        // TODO missing entry information and columName for list repeator
        return populateFileList($(thisy.el).closest('fl-list-repeater-row').attr('data-row-id'), thisy.fields.dataSource, thisy.data.row)
      }
    },
    views: [
      {
        name: 'content',
        displayName: 'File list content',
        placeholder: '<p>Configure File list component</p>'
      }
    ]
  }
});