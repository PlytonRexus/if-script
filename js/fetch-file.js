function fetchFile(addr, site) {
    fetch(addr)    // 1) fetch the url
    .then(response => {
        if (!response.ok) {
        throw new Error('Network response was not ok');
        }
        return response.blob();
    })
    .then(blob => {
        IF[site] = window.URL.createObjectURL(blob);
    })
    .catch(err => console.log("Some fetch error occured."));
}

export { fetchFile };